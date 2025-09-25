from django.db import models
from django.contrib.auth.models import User
from django.core.validators import FileExtensionValidator, MinValueValidator, MaxValueValidator
import uuid
import os

def model_upload_path(instance, filename):
    """Generate upload path for 3D models"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4().hex}.{ext}"
    return f"models/{instance.category.slug}/{filename}"

def thumbnail_upload_path(instance, filename):
    """Generate upload path for thumbnails"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4().hex}.{ext}"
    return f"thumbnails/{instance.category.slug}/{filename}"

class AccessoryCategory(models.Model):
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True, help_text="Font Awesome icon class")
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = "Accessory Categories"
        ordering = ['sort_order', 'name']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return self.name
    
    @property
    def active_models_count(self):
        return self.models.filter(is_active=True).count()

class AccessoryModel(models.Model):
    QUALITY_CHOICES = [
        ('low', 'Low (< 1MB)'),
        ('medium', 'Medium (1-5MB)'),
        ('high', 'High (5-10MB)'),
        ('ultra', 'Ultra (> 10MB)'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    category = models.ForeignKey(AccessoryCategory, on_delete=models.CASCADE, related_name='models')
    description = models.TextField(blank=True)
    
    # File fields
    model_file = models.FileField(
        upload_to=model_upload_path,
        validators=[FileExtensionValidator(allowed_extensions=['glb', 'gltf'])]
    )
    thumbnail = models.ImageField(upload_to=thumbnail_upload_path, blank=True)
    
    # Model properties
    quality = models.CharField(max_length=10, choices=QUALITY_CHOICES, default='medium')
    file_size = models.PositiveIntegerField(help_text="File size in bytes", blank=True, null=True)
    polygon_count = models.PositiveIntegerField(blank=True, null=True)
    
    # Positioning parameters
    default_scale = models.FloatField(
        default=1.0, 
        validators=[MinValueValidator(0.1), MaxValueValidator(5.0)]
    )
    default_position_x = models.FloatField(default=0.0)
    default_position_y = models.FloatField(default=0.0)
    default_position_z = models.FloatField(default=0.0)
    default_rotation_x = models.FloatField(default=0.0)
    default_rotation_y = models.FloatField(default=0.0)
    default_rotation_z = models.FloatField(default=0.0)
    
    # Metadata
    tags = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    upload_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Usage statistics
    download_count = models.PositiveIntegerField(default=0)
    usage_count = models.PositiveIntegerField(default=0)
    average_rating = models.FloatField(default=0.0)
    
    class Meta:
        ordering = ['-is_featured', '-created_at']
        indexes = [
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['is_featured']),
            models.Index(fields=['quality']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.category.name})"
    
    def save(self, *args, **kwargs):
        # Calculate file size if not provided
        if self.model_file and not self.file_size:
            self.file_size = self.model_file.size
        
        # Determine quality based on file size
        if self.file_size:
            if self.file_size < 1024 * 1024:  # < 1MB
                self.quality = 'low'
            elif self.file_size < 5 * 1024 * 1024:  # < 5MB
                self.quality = 'medium'
            elif self.file_size < 10 * 1024 * 1024:  # < 10MB
                self.quality = 'high'
            else:
                self.quality = 'ultra'
        
        super().save(*args, **kwargs)
    
    @property
    def file_size_mb(self):
        if self.file_size:
            return round(self.file_size / (1024 * 1024), 2)
        return 0
    
    @property
    def default_transform(self):
        return {
            'position': {
                'x': self.default_position_x,
                'y': self.default_position_y,
                'z': self.default_position_z
            },
            'rotation': {
                'x': self.default_rotation_x,
                'y': self.default_rotation_y,
                'z': self.default_rotation_z
            },
            'scale': self.default_scale
        }
    
    def increment_usage(self):
        """Increment usage count"""
        self.usage_count += 1
        self.save(update_fields=['usage_count'])

class ModelRating(models.Model):
    model = models.ForeignKey(AccessoryModel, on_delete=models.CASCADE, related_name='ratings')
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    session_key = models.CharField(max_length=100, blank=True)
    rating = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['model', 'user', 'session_key']
        indexes = [
            models.Index(fields=['model', 'rating']),
        ]
    
    def __str__(self):
        return f"{self.model.name} - {self.rating}/5"

class ModelCollection(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_public = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    models = models.ManyToManyField(AccessoryModel, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name