class DjangoModelLoader {
    constructor() {
        // Handle different ways GLTFLoader might be available
        try {
            if (typeof THREE.GLTFLoader !== 'undefined') {
                this.loader = new THREE.GLTFLoader();
            } else if (typeof GLTFLoader !== 'undefined') {
                this.loader = new GLTFLoader();
            } else {
                console.warn('GLTFLoader not found. Using fallback to simple models only.');
                this.loader = null;
            }
        } catch (error) {
            console.warn('Error creating GLTFLoader:', error, 'Using fallback to simple models only.');
            this.loader = null;
        }

        this.loadedModels = new Map();
        this.availableModels = {};
        this.csrfToken = this.getCsrfToken();
        this.currentCategory = 'glasses';
        this.simpleModelGenerator = new SimpleModelGenerator();
    }
    
    getCsrfToken() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrftoken') {
                return value;
            }
        }
        return '';
    }
    
    async loadAvailableModels() {
        try {
            const response = await fetch('/api/models/list/', {
                headers: {
                    'X-CSRFToken': this.csrfToken
                }
            });
            const result = await response.json();
            
            if (result.success) {
                // If no models are available from the server, use simple models
                if (Object.keys(result.models).length === 0 ||
                    (result.models.glasses && result.models.glasses.length === 0 &&
                     result.models.hats && result.models.hats.length === 0)) {
                    console.log('No server models found, using simple geometric models');
                    this.availableModels = this.simpleModelGenerator.getAvailableModels();
                } else {
                    this.availableModels = result.models;
                }
                return this.availableModels;
            } else {
                console.error('Failed to load models:', result.error);
                // Fallback to simple models
                this.availableModels = this.simpleModelGenerator.getAvailableModels();
                return this.availableModels;
            }
        } catch (error) {
            console.error('Error loading models:', error);
            return {};
        }
    }
    
    async loadModel(modelUrl, modelId = null) {
        // Check if this is a simple model (no URL)
        if (!modelUrl && modelId) {
            const simpleModel = this.simpleModelGenerator.getModel(modelId);
            if (simpleModel) {
                return simpleModel;
            }
        }

        if (this.loadedModels.has(modelUrl)) {
            return this.loadedModels.get(modelUrl).clone();
        }

        // If no GLTFLoader available, fall back to simple models
        if (!this.loader) {
            console.warn('GLTFLoader not available, using simple model fallback');
            const simpleModel = this.simpleModelGenerator.getModel(modelId || 'glasses_1');
            if (simpleModel) {
                return simpleModel;
            }
            throw new Error('No model loader available and no simple model found');
        }

        return new Promise((resolve, reject) => {
            this.loader.load(
                modelUrl,
                (gltf) => {
                    const model = gltf.scene;
                    this.optimizeModel(model);
                    this.loadedModels.set(modelUrl, model);
                    resolve(model.clone());
                },
                (progress) => {
                    console.log('Loading progress:', (progress.loaded / progress.total) * 100, '%');
                },
                (error) => {
                    console.error('Error loading model:', error);
                    // Fall back to simple model on error
                    const simpleModel = this.simpleModelGenerator.getModel(modelId || 'glasses_1');
                    if (simpleModel) {
                        resolve(simpleModel);
                    } else {
                        reject(error);
                    }
                }
            );
        });
    }
    
    optimizeModel(model) {
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                if (child.material) {
                    child.material.needsUpdate = true;
                    if (child.material.transparent) {
                        child.material.alphaTest = 0.1;
                    }
                }
                
                if (child.geometry) {
                    child.geometry.computeBoundingBox();
                    child.geometry.computeBoundingSphere();
                }
            }
        });
        
        model.scale.set(1, 1, 1);
        model.position.set(0, 0, 0);
        model.rotation.set(0, 0, 0);
        
        return model;
    }
    
    async uploadModel(file, name, category, description = '') {
        try {
            const formData = new FormData();
            formData.append('model_file', file);
            formData.append('name', name);
            formData.append('category', category);
            formData.append('description', description);
            
            const response = await fetch('/api/models/upload/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': this.csrfToken
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Reload available models
                await this.loadAvailableModels();
                return result;
            } else {
                throw new Error(result.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Model upload error:', error);
            throw error;
        }
    }
    
    async deleteModel(modelId) {
        try {
            const response = await fetch(`/api/models/delete/${modelId}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': this.csrfToken
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                await this.loadAvailableModels();
                return true;
            } else {
                throw new Error(result.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Model delete error:', error);
            return false;
        }
    }
    
    renderModelsGrid(container, category = null) {
        if (!container) return;
        
        const targetCategory = category || this.currentCategory;
        const models = this.availableModels[targetCategory] || [];
        
        container.innerHTML = '';
        
        if (models.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #ccc;">No models available</p>';
            return;
        }
        
        models.forEach(model => {
            const modelElement = document.createElement('div');
            modelElement.className = 'model-item';
            modelElement.dataset.modelId = model.id;
            modelElement.dataset.modelUrl = model.file_url;
            
            modelElement.innerHTML = `
                ${model.thumbnail_url ? 
                    `<img src="${model.thumbnail_url}" alt="${model.name}">` : 
                    '<div style="width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 5px; margin-bottom: 0.5rem;"></div>'
                }
                <div class="model-name">${model.name}</div>
                <div class="model-size" style="font-size: 10px; opacity: 0.7;">${model.file_size_mb}MB</div>
            `;
            
            modelElement.addEventListener('click', () => {
                // Remove active class from all models
                container.querySelectorAll('.model-item').forEach(item => {
                    item.classList.remove('active', 'selected');
                });

                // Add active class to clicked model with animation
                modelElement.classList.add('active', 'selected');

                // Add fade-in animation to the element
                modelElement.classList.add('fade-in');
                setTimeout(() => {
                    modelElement.classList.remove('fade-in');
                }, 500);

                // Trigger model selection event
                const event = new CustomEvent('modelSelected', {
                    detail: {
                        model: model,
                        category: targetCategory
                    }
                });
                container.dispatchEvent(event);
            });
            
            container.appendChild(modelElement);
        });
    }
}