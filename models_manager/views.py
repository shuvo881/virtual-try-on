from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q, Avg
from django.core.files.storage import default_storage
from django.shortcuts import get_object_or_404
import logging

from .models import AccessoryCategory, AccessoryModel, ModelRating, ModelCollection
from .serializers import (
    AccessoryCategorySerializer, AccessoryModelSerializer, 
    ModelRatingSerializer, ModelCollectionSerializer
)

logger = logging.getLogger(__name__)

class AccessoryCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for browsing accessory categories
    """
    queryset = AccessoryCategory.objects.filter(is_active=True)
    serializer_class = AccessoryCategorySerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'

class AccessoryModelViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing 3D accessory models
    """
    serializer_class = AccessoryModelSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        queryset = AccessoryModel.objects.filter(is_active=True)
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__slug=category)
        
        # Filter by quality
        quality = self.request.query_params.get('quality')
        if quality:
            queryset = queryset.filter(quality=quality)
        
        # Filter by featured
        featured = self.request.query_params.get('featured')
        if featured and featured.lower() == 'true':
            queryset = queryset.filter(is_featured=True)
        
        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(description__icontains=search) |
                Q(tags__contains=[search])
            )
        
        # Ordering
        ordering = self.request.query_params.get('ordering', '-created_at')
        if ordering in ['name', '-name', 'created_at', '-created_at', 'usage_count', '-usage_count']:
            queryset = queryset.order_by(ordering)
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(upload_by=self.request.user if self.request.user.is_authenticated else None)
    
    @action(detail=True, methods=['post'])
    def increment_usage(self, request, pk=None):
        """Increment model usage count"""
        model = self.get_object()
        model.increment_usage()
        return Response({'usage_count': model.usage_count})
    
    @action(detail=True, methods=['post'])
    def rate(self, request, pk=None):
        """Rate a model"""
        model = self.get_object()
        rating_value = request.data.get('rating')
        comment = request.data.get('comment', '')
        
        if not rating_value or not (1 <= int(rating_value) <= 5):
            return Response(
                {'error': 'Rating must be between 1 and 5'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create or update rating
        rating, created = ModelRating.objects.update_or_create(
            model=model,
            user=request.user if request.user.is_authenticated else None,
            session_key=request.session.session_key if not request.user.is_authenticated else '',
            defaults={
                'rating': int(rating_value),
                'comment': comment
            }
        )
        
        # Update model average rating
        avg_rating = ModelRating.objects.filter(model=model).aggregate(
            avg=Avg('rating')
        )['avg'] or 0
        model.average_rating = round(avg_rating, 2)
        model.save(update_fields=['average_rating'])
        
        serializer = ModelRatingSerializer(rating)
        return Response({
            'rating': serializer.data,
            'average_rating': model.average_rating,
            'created': created
        })
    
    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Get featured models"""
        featured_models = self.get_queryset().filter(is_featured=True)[:10]
        serializer = self.get_serializer(featured_models, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def popular(self, request):
        """Get popular models by usage"""
        popular_models = self.get_queryset().order_by('-usage_count')[:10]
        serializer = self.get_serializer(popular_models, many=True)
        return Response(serializer.data)

class ModelCollectionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for model collections
    """
    serializer_class = ModelCollectionSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        if self.request.user.is_authenticated:
            return ModelCollection.objects.filter(
                Q(is_public=True) | Q(created_by=self.request.user)
            )
        return ModelCollection.objects.filter(is_public=True)
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def add_model(self, request, pk=None):
        """Add model to collection"""
        collection = self.get_object()
        model_id = request.data.get('model_id')
        
        if not model_id:
            return Response(
                {'error': 'model_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            model = AccessoryModel.objects.get(id=model_id, is_active=True)
            collection.models.add(model)
            return Response({'message': 'Model added to collection'})
        except AccessoryModel.DoesNotExist:
            return Response(
                {'error': 'Model not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def remove_model(self, request, pk=None):
        """Remove model from collection"""
        collection = self.get_object()
        model_id = request.data.get('model_id')
        
        if not model_id:
            return Response(
                {'error': 'model_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            model = AccessoryModel.objects.get(id=model_id)
            collection.models.remove(model)
            return Response({'message': 'Model removed from collection'})
        except AccessoryModel.DoesNotExist:
            return Response(
                {'error': 'Model not found'},
                status=status.HTTP_404_NOT_FOUND
            )

@api_view(['GET'])
@permission_classes([AllowAny])
def list_models_by_category(request):
    """
    List models grouped by category for the frontend
    """
    try:
        categories = AccessoryCategory.objects.filter(is_active=True).prefetch_related('models')
        result = {
            'success': True,
            'models': {}
        }

        for category in categories:
            active_models = category.models.filter(is_active=True)
            models_data = []

            for model in active_models:
                model_data = {
                    'id': str(model.id),
                    'name': model.name,
                    'description': model.description,
                    'file_url': request.build_absolute_uri(model.model_file.url) if model.model_file else None,
                    'thumbnail_url': request.build_absolute_uri(model.thumbnail.url) if model.thumbnail else None,
                    'file_size_mb': model.file_size_mb,
                    'default_transform': model.default_transform,
                    'tags': model.tags,
                    'is_featured': model.is_featured,
                    'average_rating': model.average_rating
                }
                models_data.append(model_data)

            result['models'][category.slug] = models_data

        return Response(result)

    except Exception as e:
        logger.error(f"Error listing models: {e}")
        return Response(
            {'success': False, 'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )