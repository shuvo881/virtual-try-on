class DjangoVirtualTryOnApp {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.status = document.getElementById('status');
        this.faceInfo = document.getElementById('face-info');
        
        this.faceTracker = new DjangoFaceTracker();
        this.modelLoader = new DjangoModelLoader();
        
        this.stream = null;
        this.isTracking = false;
        this.currentModels = {
            glasses: null,
            hats: null
        };
        
        this.settings = {
            scale: 1,
            positionX: 0,
            positionY: 0
        };
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        this.init();
    }
    
    async init() {
        try {
            this.updateStatus('Loading models...');
            await this.modelLoader.loadAvailableModels();
            
            this.setupThreeJS();
            this.setupControls();
            this.setupModelGrid();
            
            this.updateStatus('Ready! Click "Start Camera" to begin.');
        } catch (error) {
            console.error('Initialization error:', error);
            this.updateStatus('Initialization error: ' + error.message);
        }
    }
    
    setupThreeJS() {
        // Three.js scene setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, this.canvas.width / this.canvas.height, 0.1, 1000);
        
        // Create a separate canvas for Three.js
        this.threeCanvas = document.createElement('canvas');
        this.threeCanvas.style.position = 'absolute';
        this.threeCanvas.style.top = '0';
        this.threeCanvas.style.left = '0';
        this.threeCanvas.style.pointerEvents = 'none';
        this.canvas.parentNode.appendChild(this.threeCanvas);
        
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.threeCanvas, 
            alpha: true,
            preserveDrawingBuffer: true 
        });
        
        this.renderer.setSize(640, 480);
        this.renderer.setClearColor(0x000000, 0);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        
        this.scene.add(ambientLight);
        this.scene.add(directionalLight);
        
        this.camera.position.z = 5;
    }
    
    setupControls() {
        // Camera controls
        document.getElementById('start-camera').addEventListener('click', () => this.startCamera());
        document.getElementById('stop-camera').addEventListener('click', () => this.stopCamera());
        document.getElementById('take-photo').addEventListener('click', () => this.takePhoto());
        
        // Category buttons (updated for new structure)
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                this.switchCategory(category);
            });
        });
        
        // Settings sliders
        const scaleSlider = document.getElementById('scale-slider');
        const posXSlider = document.getElementById('pos-x-slider');
        const posYSlider = document.getElementById('pos-y-slider');
        
        scaleSlider.addEventListener('input', (e) => {
            this.settings.scale = parseFloat(e.target.value);
            document.getElementById('scale-value').textContent = e.target.value;
        });
        
        posXSlider.addEventListener('input', (e) => {
            this.settings.positionX = parseInt(e.target.value);
            document.getElementById('pos-x-value').textContent = e.target.value;
        });
        
        posYSlider.addEventListener('input', (e) => {
            this.settings.positionY = parseInt(e.target.value);
            document.getElementById('pos-y-value').textContent = e.target.value;
        });
        
        // Upload controls
        document.getElementById('upload-btn').addEventListener('click', () => this.handleModelUpload());
        
        // Model selection
        const modelsContainer = document.getElementById('models-container');
        modelsContainer.addEventListener('modelSelected', (e) => {
            this.selectModel(e.detail.model, e.detail.category);
        });
    }
    
    setupModelGrid() {
        const container = document.getElementById('models-container');
        this.modelLoader.renderModelsGrid(container, 'glasses');
    }
    
    switchCategory(category) {
        // Update active category button
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-category="${category}"]`).classList.add('active');

        // Update models grid
        this.modelLoader.currentCategory = category;
        const container = document.getElementById('models-container');
        this.modelLoader.renderModelsGrid(container, category);
    }
    
    async selectModel(model, category) {
        try {
            this.updateStatus(`Loading ${model.name}...`);
            const threeModel = await this.modelLoader.loadModel(model.file_url, model.id);

            if (this.currentModels[category]) {
                this.scene.remove(this.currentModels[category]);
            }

            this.currentModels[category] = threeModel;
            this.scene.add(threeModel);

            this.updateStatus(`${model.name} loaded successfully!`);
        } catch (error) {
            console.error(`Error loading model:`, error);
            this.updateStatus(`Error loading ${model.name}: ${error.message}`);
        }
    }
    
    async startCamera() {
        try {
            this.updateStatus('Requesting camera access...');
            
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 }
            });
            
            this.video.srcObject = this.stream;
            
            this.video.onloadedmetadata = () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                this.threeCanvas.width = this.video.videoWidth;
                this.threeCanvas.height = this.video.videoHeight;
                this.renderer.setSize(this.video.videoWidth, this.video.videoHeight);

                // Hide camera overlay with animation
                const cameraOverlay = document.querySelector('.camera-overlay');
                if (cameraOverlay) {
                    cameraOverlay.style.opacity = '0';
                    setTimeout(() => {
                        cameraOverlay.style.display = 'none';
                    }, 300);
                }

                // Add active glow effect to camera frame
                const cameraFrame = document.querySelector('.camera-frame');
                if (cameraFrame) {
                    cameraFrame.classList.add('active');
                }

                document.getElementById('start-camera').disabled = true;
                document.getElementById('stop-camera').disabled = false;
                document.getElementById('take-photo').disabled = false;
                
                this.updateStatus('Camera started! Face tracking active.');
                this.startTracking();
            };
            
        } catch (error) {
            console.error('Camera error:', error);
            this.updateStatus('Error accessing camera: ' + error.message);
        }
    }
    
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        this.faceTracker.stopContinuousDetection();
        this.isTracking = false;

        // Show camera overlay again with animation
        const cameraOverlay = document.querySelector('.camera-overlay');
        if (cameraOverlay) {
            cameraOverlay.style.display = 'flex';
            cameraOverlay.style.opacity = '0';
            setTimeout(() => {
                cameraOverlay.style.opacity = '1';
            }, 100);
        }

        // Remove active glow effect from camera frame
        const cameraFrame = document.querySelector('.camera-frame');
        if (cameraFrame) {
            cameraFrame.classList.remove('active');
        }

        document.getElementById('start-camera').disabled = false;
        document.getElementById('stop-camera').disabled = true;
        document.getElementById('take-photo').disabled = true;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.renderer.clear();
        this.updateStatus('Camera stopped. Click "Start Camera" to begin again.');
        this.faceInfo.textContent = 'No face detected';
    }
    
    startTracking() {
        this.isTracking = true;
        
        const track = () => {
            if (this.isTracking && this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
                // Clear canvas and draw video frame
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
                
                // Render 3D models
                this.renderer.render(this.scene, this.camera);
            }
            
            if (this.isTracking) {
                requestAnimationFrame(track);
            }
        };
        
        track();
        
        // Start continuous face detection
        this.faceTracker.startContinuousDetection(
            this.video, 
            (landmarks) => this.updateModels(landmarks),
            200 // Detection every 200ms
        );
    }
    
    updateModels(landmarks) {
        if (!landmarks) {
            this.faceInfo.textContent = 'No face detected';
            return;
        }
        
        this.displayFaceInfo(landmarks);
        
        // Update glasses position
        if (this.currentModels.glasses) {
            const eyeCenter = {
                x: (landmarks.left_eye.x + landmarks.right_eye.x) / 2,
                y: (landmarks.left_eye.y + landmarks.right_eye.y) / 2,
                z: (landmarks.left_eye.z + landmarks.right_eye.z) / 2
            };
            
            this.positionModel(this.currentModels.glasses, eyeCenter, landmarks.face_width * 0.8);
        }
        
        // Update hat position
        if (this.currentModels.hats) {
            const hatPosition = {
                x: landmarks.forehead.x,
                y: landmarks.forehead.y - 30,
                z: landmarks.forehead.z
            };
            
            this.positionModel(this.currentModels.hats, hatPosition, landmarks.face_width);
        }
    }
    
    positionModel(model, position, faceWidth) {
        // Convert screen coordinates to 3D world coordinates
        const x = (position.x / this.canvas.width) * 4 - 2;
        const y = -((position.y / this.canvas.height) * 4 - 2);
        const z = -2; // Fixed distance from camera

        model.position.set(
            x + this.settings.positionX * 0.02,
            y + this.settings.positionY * 0.02,
            z
        );

        // Scale based on face width and user settings
        const baseScale = Math.max(faceWidth / 300, 0.5);
        const scale = baseScale * this.settings.scale;
        model.scale.set(scale, scale, scale);

        // Apply face rotation if available
        if (position.rotation !== undefined) {
            model.rotation.z = position.rotation;
        }
    }
    
    displayFaceInfo(landmarks) {
        this.faceInfo.innerHTML = `
            Face detected • Confidence: ${(landmarks.confidence * 100).toFixed(0)}% • Size: ${Math.round(landmarks.face_width)}×${Math.round(landmarks.face_height)}px
        `;
    }
    
    async handleModelUpload() {
        const fileInput = document.getElementById('model-upload');
        const nameInput = document.getElementById('model-name');
        const categorySelect = document.getElementById('model-category');
        
        const file = fileInput.files[0];
        const name = nameInput.value.trim();
        const category = categorySelect.value;
        
        if (!file) {
            alert('Please select a model file');
            return;
        }
        
        if (!name) {
            alert('Please enter a model name');
            return;
        }
        
        try {
            this.updateStatus('Uploading model...');
            await this.modelLoader.uploadModel(file, name, category);

            // Clear form
            fileInput.value = '';
            nameInput.value = '';

            // Refresh models grid if current category
            if (category === this.modelLoader.currentCategory) {
                this.setupModelGrid();
            }

            this.updateStatus(`${name} uploaded successfully!`);
        } catch (error) {
            console.error('Upload error:', error);
            this.updateStatus('Upload failed: ' + error.message);
        }
    }
    
    async takePhoto() {
        if (!this.canvas || this.canvas.width === 0) {
            alert('No video feed available');
            return;
        }
        
        try {
            // Create a composite canvas with video + 3D models
            const compositeCanvas = document.createElement('canvas');
            compositeCanvas.width = this.canvas.width;
            compositeCanvas.height = this.canvas.height;
            const compositeCtx = compositeCanvas.getContext('2d');
            
            // Draw video frame
            compositeCtx.drawImage(this.video, 0, 0);
            
            // Draw 3D models overlay
            compositeCtx.drawImage(this.threeCanvas, 0, 0);
            
            // Create download link
            compositeCanvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `virtual-tryron-${Date.now()}.jpg`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                this.updateStatus('Photo saved successfully! 📸');
            }, 'image/jpeg', 0.9);
            
        } catch (error) {
            console.error('Photo capture error:', error);
            this.updateStatus('Error taking photo: ' + error.message);
        }
    }
    
    updateStatus(message) {
        this.status.textContent = message;
    }
}

// Initialize the app when page loads
document.addEventListener('DOMContentLoaded', () => {
    new DjangoVirtualTryOnApp();
});