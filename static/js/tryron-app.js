class DjangoVirtualTryOnApp {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.status = document.getElementById('status');
        this.faceInfo = document.getElementById('face-info');
        
        this.faceTracker = new HybridFaceTracker();
        this.modelLoader = new DjangoModelLoader();
        
        this.stream = null;
        this.isTracking = false;
        this.currentModels = {
            glasses: null,
            hats: null
        };
        
        // Automatic positioning using MediaPipe - no manual adjustments needed
        
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
        this.threeCanvas.style.zIndex = '10'; // Ensure it's on top
        this.canvas.parentNode.appendChild(this.threeCanvas);

        console.log('Three.js canvas created and added to DOM:', this.threeCanvas);
        
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
        
        // Automatic positioning - no manual controls needed
        
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
            console.log('Selecting model:', model.name, 'Category:', category, 'URL:', model.file_url);

            const threeModel = await this.modelLoader.loadModel(model.file_url, model.id);
            console.log('Model loaded successfully:', threeModel);

            if (this.currentModels[category]) {
                this.scene.remove(this.currentModels[category]);
                console.log('Removed previous model from category:', category);
            }

            this.currentModels[category] = threeModel;
            this.scene.add(threeModel);
            console.log('Added model to scene. Current models:', this.currentModels);

            // Make sure the model is visible by setting initial position
            if (category === 'glasses') {
                // Position glasses in front of camera and make them larger
                threeModel.position.set(0, 0, -3);
                threeModel.scale.set(2, 2, 2);
                console.log('Set glasses initial position and scale:', threeModel.position, threeModel.scale);
            } else if (category === 'hats') {
                threeModel.position.set(0, 0.5, -3);
                threeModel.scale.set(2, 2, 2);
            }

            this.updateStatus(`${model.name} loaded successfully! Look at the camera to see it positioned on your face.`);

            // Test: Make model visible immediately for debugging
            setTimeout(() => {
                if (category === 'glasses' && threeModel) {
                    threeModel.position.set(0, 0, -3);
                    threeModel.scale.set(3, 3, 3);
                    threeModel.visible = true;
                    console.log('Force showing model for testing:', threeModel);
                }
            }, 1000);
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

                // Render 3D models silently
            }
            
            if (this.isTracking) {
                requestAnimationFrame(track);
            }
        };
        
        track();
        
        // Add a test cube to verify 3D rendering is working
        this.addTestCube();

        // Start continuous face detection with MediaPipe
        this.faceTracker.startContinuousDetection(
            this.video,
            (landmarks) => this.updateModels(landmarks),
            100 // Detection every 100ms for smoother tracking
        );
    }
    
    updateModels(landmarks) {
        if (!landmarks) {
            this.faceInfo.textContent = 'No face detected';
            return;
        }

        // Debug landmarks structure to understand what we're receiving
        if (Math.random() < 0.1) { // 10% of the time
            console.log('Received landmarks structure:', {
                landmarks: landmarks,
                keys: Object.keys(landmarks || {}),
                left_eye: landmarks?.left_eye,
                right_eye: landmarks?.right_eye,
                face_width: landmarks?.face_width
            });
        }

        this.displayFaceInfo(landmarks);
        
        // Update glasses position with improved manual calculation
        if (this.currentModels.glasses) {
            // Check if we have valid eye landmarks
            if (!landmarks.left_eye || !landmarks.right_eye) {
                console.warn('Missing eye landmarks:', landmarks);
                return;
            }

            // Ensure eye landmarks have x,y coordinates
            if (typeof landmarks.left_eye.x === 'undefined' || typeof landmarks.right_eye.x === 'undefined') {
                console.warn('Invalid eye landmark structure:', {
                    left_eye: landmarks.left_eye,
                    right_eye: landmarks.right_eye
                });
                return;
            }

            // Calculate eye center with safety checks
            // Since video is flipped, we need to flip X coordinates
            const eyeCenter = {
                x: this.canvas.width - (landmarks.left_eye.x + landmarks.right_eye.x) / 2, // Flip X coordinate
                y: (landmarks.left_eye.y + landmarks.right_eye.y) / 2 + 15, // Move down to nose bridge
                z: ((landmarks.left_eye.z || 0) + (landmarks.right_eye.z || 0)) / 2
            };

            // Calculate eye distance for proper scaling
            // Flip coordinates for distance calculation since video is flipped
            const leftEyeFlipped = { x: this.canvas.width - landmarks.left_eye.x, y: landmarks.left_eye.y };
            const rightEyeFlipped = { x: this.canvas.width - landmarks.right_eye.x, y: landmarks.right_eye.y };

            const eyeDistance = Math.sqrt(
                Math.pow(rightEyeFlipped.x - leftEyeFlipped.x, 2) +
                Math.pow(rightEyeFlipped.y - leftEyeFlipped.y, 2)
            );

            // Use eye distance for more accurate scaling
            const glassesScale = Math.max(eyeDistance * 1.8, 80); // Minimum 80px width

            console.log('Glasses positioning:', {
                eyeCenter: eyeCenter,
                eyeDistance: eyeDistance,
                scale: glassesScale,
                faceWidth: landmarks.face_width,
                landmarks: landmarks
            });

            this.positionModelImproved(this.currentModels.glasses, eyeCenter, glassesScale, landmarks.orientation);
        }
        
        // Update hat position using MediaPipe's precise accessory positioning
        if (this.currentModels.hats) {
            let hatPosition, hatScale;

            if (landmarks.accessory_positions && landmarks.accessory_positions.hat) {
                // Use MediaPipe's calculated hat position (flip X coordinate)
                hatPosition = {
                    x: this.canvas.width - landmarks.accessory_positions.hat.position.x,
                    y: landmarks.accessory_positions.hat.position.y,
                    z: landmarks.accessory_positions.hat.position.z
                };
                hatScale = landmarks.accessory_positions.hat.scale;
            } else {
                // Fallback to manual calculation (flip X coordinate)
                hatPosition = {
                    x: this.canvas.width - landmarks.forehead.x,
                    y: landmarks.forehead.y - 30,
                    z: landmarks.forehead.z || 0
                };
                hatScale = landmarks.face_width * 0.8;
            }

            this.positionModelWithPrecision(this.currentModels.hats, hatPosition, hatScale, landmarks.orientation);
        }
    }
    
    positionModel(model, position, faceWidth) {
        // Convert screen coordinates to 3D world coordinates
        const x = (position.x / this.canvas.width) * 4 - 2;
        const y = -((position.y / this.canvas.height) * 4 - 2);
        const z = -2.5; // Optimal distance from camera

        model.position.set(x, y, z);

        // Better scaling based on face width for glasses
        const baseScale = Math.max(faceWidth / 400, 0.2); // Even smaller, more realistic scale
        const scale = baseScale * 0.8; // Much more conservative scaling
        model.scale.set(scale, scale, scale);

        // Apply face rotation if available
        if (position.rotation !== undefined) {
            model.rotation.z = position.rotation;
        }

        // Debug positioning occasionally
        if (Math.random() < 0.01) { // 1% of the time for debugging
            console.log('Model positioned:', {
                screenPos: {x: position.x.toFixed(0), y: position.y.toFixed(0)},
                worldPos: {x: x.toFixed(2), y: y.toFixed(2), z: z.toFixed(2)},
                faceWidth: faceWidth.toFixed(0),
                scale: scale.toFixed(2)
            });
        }
    }

    positionModelWithPrecision(model, position, scale, orientation) {
        // Convert screen coordinates to 3D world coordinates
        const x = (position.x / this.canvas.width) * 4 - 2;
        const y = -((position.y / this.canvas.height) * 4 - 2);
        const z = -2.5; // Optimal distance from camera

        model.position.set(x, y, z);

        // Use MediaPipe's calculated scale
        const finalScale = Math.max(scale, 0.1); // Minimum scale for visibility
        model.scale.set(finalScale, finalScale, finalScale);

        // Apply MediaPipe's face orientation for realistic rotation
        if (orientation) {
            model.rotation.x = orientation.pitch || 0;
            model.rotation.y = orientation.yaw || 0;
            model.rotation.z = orientation.roll || 0;
        }

        // Debug MediaPipe positioning occasionally
        if (Math.random() < 0.02) { // 2% of the time for debugging
            console.log('MediaPipe Model positioned:', {
                screenPos: {x: position.x.toFixed(0), y: position.y.toFixed(0)},
                worldPos: {x: x.toFixed(2), y: y.toFixed(2), z: z.toFixed(2)},
                scale: finalScale.toFixed(3),
                orientation: orientation ? {
                    pitch: orientation.pitch_degrees?.toFixed(1),
                    yaw: orientation.yaw_degrees?.toFixed(1),
                    roll: orientation.roll_degrees?.toFixed(1)
                } : 'none'
            });
        }
    }

    positionModelImproved(model, position, scale, orientation) {
        // Convert screen coordinates to 3D world coordinates with better mapping
        const x = ((position.x / this.canvas.width) - 0.5) * 3; // Better range mapping
        const y = -((position.y / this.canvas.height) - 0.5) * 3; // Better range mapping
        const z = -1.8; // Closer to camera for better visibility

        model.position.set(x, y, z);

        // Improved scaling - make glasses much more visible
        const baseScale = Math.max(scale / 150, 0.8); // Larger minimum scale
        const finalScale = baseScale * 1.5; // Make them bigger
        model.scale.set(finalScale, finalScale, finalScale);

        // Apply face orientation if available
        if (orientation) {
            model.rotation.x = (orientation.pitch || 0) * 0.5; // Reduce rotation intensity
            model.rotation.y = (orientation.yaw || 0) * 0.5;
            model.rotation.z = (orientation.roll || 0) * 0.8;
        }

        // Always log positioning for debugging
        console.log('Improved Model positioned:', {
            screenPos: {x: position.x.toFixed(0), y: position.y.toFixed(0)},
            worldPos: {x: x.toFixed(2), y: y.toFixed(2), z: z.toFixed(2)},
            inputScale: scale,
            finalScale: finalScale.toFixed(3),
            canvasSize: {w: this.canvas.width, h: this.canvas.height}
        });
    }

    addTestCube() {
        // Add a visible test cube to verify 3D rendering
        const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: true
        });
        this.testCube = new THREE.Mesh(geometry, material);
        this.testCube.position.set(1, 1, -2);
        this.scene.add(this.testCube);

        console.log('Test cube added to verify 3D rendering');

        // Remove test cube after 5 seconds
        setTimeout(() => {
            if (this.testCube) {
                this.scene.remove(this.testCube);
                console.log('Test cube removed');
            }
        }, 5000);
    }
    
    displayFaceInfo(landmarks) {
        const source = landmarks.source || 'django';
        const sourceIcon = source === 'client_mediapipe' ? '⚡' : '🌐';
        this.faceInfo.innerHTML = `
            ${sourceIcon} Face detected • Confidence: ${(landmarks.confidence * 100).toFixed(0)}% • Size: ${Math.round(landmarks.face_width)}×${Math.round(landmarks.face_height)}px
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