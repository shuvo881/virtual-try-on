from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from models_manager.models import AccessoryCategory, AccessoryModel
import os

class Command(BaseCommand):
    help = 'Populate sample data for the virtual try-on booth'
    
    def handle(self, *args, **options):
        # Create categories
        glasses_cat, created = AccessoryCategory.objects.get_or_create(
            name='Glasses',
            defaults={'description': 'Eyeglasses and sunglasses'}
        )
        
        hats_cat, created = AccessoryCategory.objects.get_or_create(
            name='Hats',
            defaults={'description': 'Hats and caps'}
        )
        
        # Create sample model entries (you'll need to add actual model files)
        sample_models = [
            {
                'name': 'Classic Glasses',
                'category': glasses_cat,
                'description': 'Simple black frame glasses',
                'default_scale': 0.8,
                'default_position_y': -5.0
            },
            {
                'name': 'Sunglasses',
                'category': glasses_cat,
                'description': 'Cool aviator sunglasses',
                'default_scale': 0.9,
                'default_position_y': -3.0
            },
            {
                'name': 'Baseball Cap',
                'category': hats_cat,
                'description': 'Classic baseball cap',
                'default_scale': 1.2,
                'default_position_y': 15.0
            },
            {
                'name': 'Fedora Hat',
                'category': hats_cat,
                'description': 'Stylish fedora hat',
                'default_scale': 1.1,
                'default_position_y': 12.0
            }
        ]
        
        for model_data in sample_models:
            model, created = AccessoryModel.objects.get_or_create(
                name=model_data['name'],
                category=model_data['category'],
                defaults=model_data
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Created model: {model.name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Model already exists: {model.name}')
                )
        
        self.stdout.write(
            self.style.SUCCESS('Sample data population completed!')
        )