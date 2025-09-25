from django.db import models
from django.contrib.auth.models import User
import uuid
import json

class FaceDetectionSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    session_key = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-last_activity']
        indexes = [
            models.Index(fields=['session_key']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Session {self.session_key[:8]}..."

class FaceDetectionResult(models.Model):
    session = models.ForeignKey(FaceDetectionSession, on_delete=models.CASCADE, related_name='detections')
    image = models.ImageField(upload_to='face_images/%Y/%m/%d/', null=True, blank=True)
    landmarks_data = models.JSONField()
    confidence_score = models.FloatField()
    face_width = models.FloatField()
    face_height = models.FloatField()
    face_angle = models.FloatField()
    processing_time = models.FloatField(help_text="Processing time in milliseconds")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['session', '-created_at']),
            models.Index(fields=['confidence_score']),
        ]
    
    def __str__(self):
        return f"Detection {self.id} - Confidence: {self.confidence_score:.2f}"
    
    @property
    def landmark_points(self):
        """Extract key landmark points"""
        if not self.landmarks_data:
            return {}
        
        return {
            'left_eye': self.landmarks_data.get('left_eye', {}),
            'right_eye': self.landmarks_data.get('right_eye', {}),
            'nose_tip': self.landmarks_data.get('nose_tip', {}),
            'forehead': self.landmarks_data.get('forehead', {}),
            'chin': self.landmarks_data.get('chin', {})
        }

class AccessoryTryOn(models.Model):
    ACCESSORY_TYPES = [
        ('glasses', 'Glasses'),
        ('hat', 'Hat'),
        ('earrings', 'Earrings'),
        ('necklace', 'Necklace'),
    ]
    
    session = models.ForeignKey(FaceDetectionSession, on_delete=models.CASCADE)
    accessory_type = models.CharField(max_length=20, choices=ACCESSORY_TYPES)
    accessory_model_id = models.PositiveIntegerField()
    position_adjustments = models.JSONField(default=dict)
    scale_factor = models.FloatField(default=1.0)
    rotation_adjustments = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['session', 'accessory_type']
    
    def __str__(self):
        return f"{self.session.session_key} - {self.accessory_type}"