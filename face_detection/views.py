from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.core.cache import cache
from django.db import transaction
import uuid
import logging
import time

from .utils import face_tracker
from .models import FaceDetectionSession, FaceDetectionResult, AccessoryTryOn

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([AllowAny])
def detect_face(request):
    """
    Advanced face detection API with session management
    """
    try:
        if 'image' not in request.FILES:
            return Response(
                {'error': 'No image file provided', 'code': 'NO_IMAGE'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        image_file = request.FILES['image']
        
        # Validate file size (max 10MB)
        if image_file.size > 10 * 1024 * 1024:
            return Response(
                {'error': 'Image file too large. Maximum size is 10MB', 'code': 'FILE_TOO_LARGE'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        if image_file.content_type not in allowed_types:
            return Response(
                {'error': 'Invalid file type. Allowed types: JPEG, PNG, WebP', 'code': 'INVALID_FILE_TYPE'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        image_data = image_file.read()
        
        # Process the image
        start_time = time.time()
        detection_result = face_tracker.detect_face_landmarks(image_data)
        processing_time = (time.time() - start_time) * 1000
        
        if detection_result:
            # Get or create session
            session_key = request.session.get('face_session_key')
            if not session_key:
                session_key = str(uuid.uuid4())
                request.session['face_session_key'] = session_key
            
            with transaction.atomic():
                session, created = FaceDetectionSession.objects.get_or_create(
                    session_key=session_key,
                    defaults={
                        'user': request.user if request.user.is_authenticated else None,
                        'is_active': True
                    }
                )
                
                # Save detection result
                detection = FaceDetectionResult.objects.create(
                    session=session,
                    image=image_file,
                    landmarks_data=detection_result,
                    confidence_score=detection_result.get('confidence', 0.0),
                    face_width=detection_result['measurements']['face_width'],
                    face_height=detection_result['measurements']['face_height'],
                    face_angle=detection_result['orientation']['roll'],
                    processing_time=processing_time
                )
            
            # Cache the latest detection for quick access
            cache.set(f'latest_detection_{session_key}', detection_result, timeout=300)
            
            return Response({
                'success': True,
                'detection_id': detection.id,
                'session_id': session_key,
                'landmarks': detection_result['landmarks'],
                'measurements': detection_result['measurements'],
                'orientation': detection_result['orientation'],
                'accessory_positions': detection_result['accessory_positions'],
                'confidence': detection_result['confidence'],
                'processing_time': processing_time
            })
        else:
            return Response({
                'success': False,
                'message': 'No face detected in the image',
                'code': 'NO_FACE_DETECTED'
            })
            
    except Exception as e:
        logger.error(f"Face detection error: {e}", exc_info=True)
        return Response(
            {'error': 'Internal server error', 'code': 'INTERNAL_ERROR'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def get_detection_history(request):
    """
    Get face detection history for current session
    """
    try:
        session_key = request.session.get('face_session_key')
        limit = min(int(request.GET.get('limit', 10)), 50)  # Max 50 results
        
        if not session_key:
            return Response({'detections': []})
        
        try:
            session = FaceDetectionSession.objects.get(session_key=session_key)
            detections = FaceDetectionResult.objects.filter(
                session=session
            ).order_by('-created_at')[:limit]
            
            detection_data = []
            for detection in detections:
                detection_data.append({
                    'id': detection.id,
                    'landmarks': detection.landmark_points,
                    'confidence': detection.confidence_score,
                    'face_width': detection.face_width,
                    'face_height': detection.face_height,
                    'processing_time': detection.processing_time,
                    'created_at': detection.created_at.isoformat(),
                    'image_url': detection.image.url if detection.image else None
                })
            
            return Response({
                'detections': detection_data,
                'total_count': session.detections.count(),
                'session_info': {
                    'created_at': session.created_at.isoformat(),
                    'last_activity': session.last_activity.isoformat(),
                    'is_active': session.is_active
                }
            })
            
        except FaceDetectionSession.DoesNotExist:
            return Response({'detections': []})
            
    except Exception as e:
        logger.error(f"History retrieval error: {e}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def save_accessory_tryron(request):
    """
    Save accessory try-on configuration
    """
    try:
        session_key = request.session.get('face_session_key')
        if not session_key:
            return Response(
                {'error': 'No active session'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        data = request.data
        accessory_type = data.get('accessory_type')
        model_id = data.get('model_id')
        
        if not accessory_type or not model_id:
            return Response(
                {'error': 'accessory_type and model_id are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            session = FaceDetectionSession.objects.get(session_key=session_key)
            
            # Update or create accessory try-on
            tryron, created = AccessoryTryOn.objects.update_or_create(
                session=session,
                accessory_type=accessory_type,
                defaults={
                    'accessory_model_id': model_id,
                    'position_adjustments': data.get('position_adjustments', {}),
                    'scale_factor': data.get('scale_factor', 1.0),
                    'rotation_adjustments': data.get('rotation_adjustments', {})
                }
            )
            
            return Response({
                'success': True,
                'message': 'Accessory configuration saved',
                'tryron_id': tryron.id,
                'created': created
            })
            
        except FaceDetectionSession.DoesNotExist:
            return Response(
                {'error': 'Session not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
    except Exception as e:
        logger.error(f"Save accessory try-on error: {e}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def get_session_tryons(request):
    """
    Get all accessory try-ons for current session
    """
    try:
        session_key = request.session.get('face_session_key')
        if not session_key:
            return Response({'tryons': []})
        
        try:
            session = FaceDetectionSession.objects.get(session_key=session_key)
            tryons = AccessoryTryOn.objects.filter(session=session).order_by('-created_at')
            
            tryron_data = []
            for tryron in tryons:
                tryron_data.append({
                    'id': tryron.id,
                    'accessory_type': tryron.accessory_type,
                    'accessory_model_id': tryron.accessory_model_id,
                    'position_adjustments': tryron.position_adjustments,
                    'scale_factor': tryron.scale_factor,
                    'rotation_adjustments': tryron.rotation_adjustments,
                    'created_at': tryron.created_at.isoformat()
                })
            
            return Response({'tryons': tryron_data})
            
        except FaceDetectionSession.DoesNotExist:
            return Response({'tryons': []})
            
    except Exception as e:
        logger.error(f"Get session try-ons error: {e}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def clear_session(request):
    """
    Clear current detection session
    """
    try:
        session_key = request.session.get('face_session_key')
        if session_key:
            FaceDetectionSession.objects.filter(
                session_key=session_key
            ).update(is_active=False)
            
            # Clear cached data
            cache.delete(f'latest_detection_{session_key}')
            
            # Clear session
            if 'face_session_key' in request.session:
                del request.session['face_session_key']
        
        return Response({'success': True, 'message': 'Session cleared'})
        
    except Exception as e:
        logger.error(f"Session clear error: {e}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )