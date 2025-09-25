from django.urls import path
from . import views

app_name = 'face_detection'

urlpatterns = [
    path('detect/', views.detect_face, name='detect_face'),
    path('history/', views.get_detection_history, name='detection_history'),
    path('tryons/', views.get_session_tryons, name='session_tryons'),
    path('tryons/save/', views.save_accessory_tryron, name='save_tryron'),
    path('clear-session/', views.clear_session, name='clear_session'),
]