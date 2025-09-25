from django.contrib import admin
from .models import FaceDetectionSession, FaceDetectionResult, AccessoryTryOn

@admin.register(FaceDetectionSession)
class FaceDetectionSessionAdmin(admin.ModelAdmin):
    list_display = ['session_key', 'user', 'created_at', 'last_activity', 'is_active']
    list_filter = ['is_active', 'created_at']
    search_fields = ['session_key', 'user__username']
    readonly_fields = ['session_key', 'created_at']

@admin.register(FaceDetectionResult)
class FaceDetectionResultAdmin(admin.ModelAdmin):
    list_display = ['id', 'session', 'confidence_score', 'processing_time', 'created_at']
    list_filter = ['confidence_score', 'created_at']
    search_fields = ['session__session_key']
    readonly_fields = ['landmarks_data', 'processing_time', 'created_at']

@admin.register(AccessoryTryOn)
class AccessoryTryOnAdmin(admin.ModelAdmin):
    list_display = ['session', 'accessory_type', 'accessory_model_id', 'scale_factor', 'created_at']
    list_filter = ['accessory_type', 'created_at']
    search_fields = ['session__session_key']