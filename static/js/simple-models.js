/**
 * Simple 3D model generator for testing purposes
 * Creates basic geometric shapes that can be used as placeholder accessories
 */

class SimpleModelGenerator {
    constructor() {
        this.models = new Map();
    }

    /**
     * Create a simple glasses model using Three.js geometry
     */
    createGlassesModel() {
        const group = new THREE.Group();
        
        // Frame material
        const frameMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x333333,
            shininess: 30
        });
        
        // Lens material
        const lensMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.3,
            shininess: 100
        });
        
        // Left lens
        const leftLensGeometry = new THREE.RingGeometry(0.8, 1.2, 16);
        const leftLens = new THREE.Mesh(leftLensGeometry, lensMaterial);
        leftLens.position.set(-1.5, 0, 0);
        group.add(leftLens);
        
        // Right lens
        const rightLensGeometry = new THREE.RingGeometry(0.8, 1.2, 16);
        const rightLens = new THREE.Mesh(rightLensGeometry, lensMaterial);
        rightLens.position.set(1.5, 0, 0);
        group.add(rightLens);
        
        // Bridge
        const bridgeGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
        const bridge = new THREE.Mesh(bridgeGeometry, frameMaterial);
        bridge.rotation.z = Math.PI / 2;
        bridge.position.set(0, 0, 0);
        group.add(bridge);
        
        // Left temple
        const leftTempleGeometry = new THREE.CylinderGeometry(0.08, 0.08, 3, 8);
        const leftTemple = new THREE.Mesh(leftTempleGeometry, frameMaterial);
        leftTemple.rotation.z = Math.PI / 2;
        leftTemple.position.set(-3, 0, -1);
        group.add(leftTemple);
        
        // Right temple
        const rightTempleGeometry = new THREE.CylinderGeometry(0.08, 0.08, 3, 8);
        const rightTemple = new THREE.Mesh(rightTempleGeometry, frameMaterial);
        rightTemple.rotation.z = Math.PI / 2;
        rightTemple.position.set(3, 0, -1);
        group.add(rightTemple);
        
        // Scale down to appropriate size
        group.scale.set(0.3, 0.3, 0.3);
        
        return group;
    }

    /**
     * Create a simple hat model using Three.js geometry
     */
    createHatModel() {
        const group = new THREE.Group();
        
        // Hat material
        const hatMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x8B4513,
            shininess: 10
        });
        
        // Crown (main part of the hat)
        const crownGeometry = new THREE.CylinderGeometry(1.2, 1.2, 1.5, 16);
        const crown = new THREE.Mesh(crownGeometry, hatMaterial);
        crown.position.set(0, 0.75, 0);
        group.add(crown);
        
        // Brim
        const brimGeometry = new THREE.CylinderGeometry(2, 2, 0.1, 32);
        const brim = new THREE.Mesh(brimGeometry, hatMaterial);
        brim.position.set(0, 0, 0);
        group.add(brim);
        
        // Scale to appropriate size
        group.scale.set(0.4, 0.4, 0.4);
        
        return group;
    }

    /**
     * Create a simple sunglasses model
     */
    createSunglassesModel() {
        const group = new THREE.Group();
        
        // Frame material
        const frameMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x000000,
            shininess: 50
        });
        
        // Dark lens material
        const lensMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x1a1a1a,
            transparent: true,
            opacity: 0.8,
            shininess: 100
        });
        
        // Left lens
        const leftLensGeometry = new THREE.CircleGeometry(1, 16);
        const leftLens = new THREE.Mesh(leftLensGeometry, lensMaterial);
        leftLens.position.set(-1.5, 0, 0);
        group.add(leftLens);
        
        // Right lens
        const rightLensGeometry = new THREE.CircleGeometry(1, 16);
        const rightLens = new THREE.Mesh(rightLensGeometry, lensMaterial);
        rightLens.position.set(1.5, 0, 0);
        group.add(rightLens);
        
        // Frame rings
        const leftFrameGeometry = new THREE.RingGeometry(1, 1.1, 16);
        const leftFrame = new THREE.Mesh(leftFrameGeometry, frameMaterial);
        leftFrame.position.set(-1.5, 0, 0.01);
        group.add(leftFrame);
        
        const rightFrameGeometry = new THREE.RingGeometry(1, 1.1, 16);
        const rightFrame = new THREE.Mesh(rightFrameGeometry, frameMaterial);
        rightFrame.position.set(1.5, 0, 0.01);
        group.add(rightFrame);
        
        // Bridge
        const bridgeGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8);
        const bridge = new THREE.Mesh(bridgeGeometry, frameMaterial);
        bridge.rotation.z = Math.PI / 2;
        bridge.position.set(0, 0, 0);
        group.add(bridge);
        
        // Scale to appropriate size
        group.scale.set(0.3, 0.3, 0.3);
        
        return group;
    }

    /**
     * Create a baseball cap model
     */
    createBaseballCapModel() {
        const group = new THREE.Group();
        
        // Cap material
        const capMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x0066CC,
            shininess: 10
        });
        
        // Crown (dome part)
        const crownGeometry = new THREE.SphereGeometry(1.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const crown = new THREE.Mesh(crownGeometry, capMaterial);
        crown.position.set(0, 0, 0);
        group.add(crown);
        
        // Visor
        const visorGeometry = new THREE.CylinderGeometry(1.8, 1.5, 0.1, 16, 1, false, 0, Math.PI);
        const visor = new THREE.Mesh(visorGeometry, capMaterial);
        visor.position.set(0, -0.3, 1);
        visor.rotation.x = -Math.PI / 6;
        group.add(visor);
        
        // Scale to appropriate size
        group.scale.set(0.4, 0.4, 0.4);
        
        return group;
    }

    /**
     * Get a model by name
     */
    getModel(modelName) {
        if (this.models.has(modelName)) {
            return this.models.get(modelName).clone();
        }
        
        let model;
        switch (modelName) {
            case 'simple-glasses':
                model = this.createGlassesModel();
                break;
            case 'simple-hat':
                model = this.createHatModel();
                break;
            case 'simple-sunglasses':
                model = this.createSunglassesModel();
                break;
            case 'simple-baseball-cap':
                model = this.createBaseballCapModel();
                break;
            default:
                console.warn(`Unknown model: ${modelName}`);
                return null;
        }
        
        this.models.set(modelName, model);
        return model.clone();
    }

    /**
     * Get list of available simple models
     */
    getAvailableModels() {
        return {
            glasses: [
                {
                    id: 'simple-glasses',
                    name: 'Simple Glasses',
                    description: 'Basic geometric glasses for testing',
                    file_url: null,
                    thumbnail_url: null,
                    file_size_mb: 0,
                    default_transform: {
                        position: { x: 0, y: 0, z: 0 },
                        rotation: { x: 0, y: 0, z: 0 },
                        scale: 1
                    },
                    tags: ['simple', 'test'],
                    is_featured: true,
                    average_rating: 5
                },
                {
                    id: 'simple-sunglasses',
                    name: 'Simple Sunglasses',
                    description: 'Basic geometric sunglasses for testing',
                    file_url: null,
                    thumbnail_url: null,
                    file_size_mb: 0,
                    default_transform: {
                        position: { x: 0, y: 0, z: 0 },
                        rotation: { x: 0, y: 0, z: 0 },
                        scale: 1
                    },
                    tags: ['simple', 'test', 'sunglasses'],
                    is_featured: true,
                    average_rating: 5
                }
            ],
            hats: [
                {
                    id: 'simple-hat',
                    name: 'Simple Hat',
                    description: 'Basic geometric hat for testing',
                    file_url: null,
                    thumbnail_url: null,
                    file_size_mb: 0,
                    default_transform: {
                        position: { x: 0, y: 0, z: 0 },
                        rotation: { x: 0, y: 0, z: 0 },
                        scale: 1
                    },
                    tags: ['simple', 'test'],
                    is_featured: true,
                    average_rating: 5
                },
                {
                    id: 'simple-baseball-cap',
                    name: 'Simple Baseball Cap',
                    description: 'Basic geometric baseball cap for testing',
                    file_url: null,
                    thumbnail_url: null,
                    file_size_mb: 0,
                    default_transform: {
                        position: { x: 0, y: 0, z: 0 },
                        rotation: { x: 0, y: 0, z: 0 },
                        scale: 1
                    },
                    tags: ['simple', 'test', 'baseball'],
                    is_featured: true,
                    average_rating: 5
                }
            ]
        };
    }
}

// Export for use in other modules
window.SimpleModelGenerator = SimpleModelGenerator;
