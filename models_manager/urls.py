from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('categories', views.AccessoryCategoryViewSet)
router.register('models', views.AccessoryModelViewSet, basename='accessorymodel')
router.register('collections', views.ModelCollectionViewSet, basename='modelcollection')

app_name = 'models_manager'

urlpatterns = [
    path('', include(router.urls)),
    path('list/', views.list_models_by_category, name='list_models'),
    path('upload/', views.upload_model, name='upload_model'),
]