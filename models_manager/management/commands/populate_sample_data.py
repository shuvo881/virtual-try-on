from django.core.management.base import BaseCommand
from models_manager.models import AccessoryCategory, AccessoryModel

class Command(BaseCommand):
    help = 'Populate database with sample accessory categories and models'

    def add_arguments(self, parser):
        parser.add_argument(
            '--skip-download',
            action='store_true',
            help='Skip downloading sample models and just create categories',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting to populate sample data...'))
        
        # Create categories
        self.create_categories()
        
        if not options['skip_download']:
            self.stdout.write('Note: Sample 3D models would need to be manually added.')
            self.stdout.write('You can upload .glb/.gltf files through the web interface.')
        
        self.stdout.write(self.style.SUCCESS('Sample data population completed!'))

    def create_categories(self):
        """Create sample accessory categories"""
        categories_data = [
            {
                'name': 'Glasses',
                'slug': 'glasses',
                'description': 'Eyeglasses, sunglasses, and other eyewear accessories',
                'icon': 'fas fa-glasses',
                'sort_order': 1
            },
            {
                'name': 'Hats',
                'slug': 'hats',
                'description': 'Caps, beanies, fedoras, and other headwear',
                'icon': 'fas fa-hat-cowboy',
                'sort_order': 2
            },
            {
                'name': 'Earrings',
                'slug': 'earrings',
                'description': 'Studs, hoops, and dangling earrings',
                'icon': 'fas fa-gem',
                'sort_order': 3
            },
            {
                'name': 'Necklaces',
                'slug': 'necklaces',
                'description': 'Chains, pendants, and chokers',
                'icon': 'fas fa-circle',
                'sort_order': 4
            }
        ]

        for category_data in categories_data:
            category, created = AccessoryCategory.objects.get_or_create(
                slug=category_data['slug'],
                defaults=category_data
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Created category: {category.name}')
                )
            else:
                self.stdout.write(f'Category already exists: {category.name}')

    def create_sample_models(self):
        """Create sample model entries (without actual files)"""
        glasses_category = AccessoryCategory.objects.get(slug='glasses')
        hats_category = AccessoryCategory.objects.get(slug='hats')
        
        sample_models = [
            {
                'name': 'Classic Aviator Sunglasses',
                'category': glasses_category,
                'description': 'Classic aviator-style sunglasses with gold frames',
                'default_scale': 1.0,
                'default_position_y': -10,
                'tags': ['sunglasses', 'aviator', 'classic']
            },
            {
                'name': 'Round Reading Glasses',
                'category': glasses_category,
                'description': 'Round frame reading glasses with thin metal frames',
                'default_scale': 0.9,
                'default_position_y': -8,
                'tags': ['reading', 'round', 'metal']
            },
            {
                'name': 'Baseball Cap',
                'category': hats_category,
                'description': 'Classic baseball cap with adjustable strap',
                'default_scale': 1.2,
                'default_position_y': -40,
                'tags': ['baseball', 'cap', 'casual']
            },
            {
                'name': 'Winter Beanie',
                'category': hats_category,
                'description': 'Warm knitted beanie for cold weather',
                'default_scale': 1.1,
                'default_position_y': -35,
                'tags': ['beanie', 'winter', 'knitted']
            }
        ]

        for model_data in sample_models:
            # Note: In a real implementation, you would need actual .glb/.gltf files
            self.stdout.write(f'Sample model template: {model_data["name"]}')
