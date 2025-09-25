class DjangoModelLoader {
    constructor() {
        this.loader = new THREE.GLTFLoader();
        this.loadedModels = new Map();
        this.availableModels = {};
        this.csrfToken = this.getCsrfToken();
        this.currentCategory = 'glasses';
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
                this.availableModels = result.models;
                return result.models;
            } else {
                console.error('Failed to load models:', result.error);
                return {};
            }
        } catch (error) {
            console.error('Error loading models:', error);
            return {};
        }
    }
    
    async loadModel(modelUrl) {
        if (this.loadedModels.has(modelUrl)) {
            return this.loadedModels.get(modelUrl).clone();
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
                    reject(error);
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
                container.querySelectorAll('.model-item').forEach(item => 
                    item.classList.remove('active')
                );
                // Add active class to clicked model
                modelElement.classList.add('active');
                
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