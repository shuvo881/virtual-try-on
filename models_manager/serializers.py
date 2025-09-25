from rest_framework import serializers
from .models import AccessoryCategory, AccessoryModel, ModelRating, ModelCollection

class AccessoryCategorySerializer(serializers.ModelSerializer):
    active_models_count = serializers.ReadOnlyField()
    
    class Meta:
        model = AccessoryCategory
        fields = [
            'id', 'name', 'slug', 'description', 'icon', 
            'sort_order', 'is_active', 'active_models_count'
        ]

class AccessoryModelSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    file_size_mb = serializers.ReadOnlyField()
    default_transform = serializers.ReadOnlyField()
    model_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    
    class Meta:
        model = AccessoryModel
        fields = [
            'id', 'name', 'category', 'category_name', 'category_slug',
            'description', 'model_url', 'thumbnail_url', 'quality',
            'file_size_mb', 'polygon_count', 'default_transform',
            'tags', 'is_featured', 'download_count', 'usage_count',
            'average_rating', 'created_at'
        ]
    
    def get_model_url(self, obj):
        request = self.context.get('request')
        if obj.model_file and request:
            return request.build_absolute_uri(obj.model_file.url)
        return None
    
    def get_thumbnail_url(self, obj):
        request = self.context.get('request')
        if obj.thumbnail and request:
            return request.build_absolute_uri(obj.thumbnail.url)
        return None

class ModelRatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModelRating
        fields = ['id', 'model', 'rating', 'comment', 'created_at']

class ModelCollectionSerializer(serializers.ModelSerializer):
    models = AccessoryModelSerializer(many=True, read_only=True)
    models_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ModelCollection
        fields = [
            'id', 'name', 'description', 'models', 'models_count',
            'is_public', 'created_at'
        ]
    
    def get_models_count(self, obj):
        return obj.models.count()