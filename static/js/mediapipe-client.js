class ClientSideMediaPipe {
    constructor() {
        this.faceMesh = null;
        this.isInitialized = false;
        this.isProcessing = false;
        this.lastResult = null;
        this.initializeMediaPipe();
    }

    async initializeMediaPipe() {
        try {
            // Initialize MediaPipe Face Mesh
            this.faceMesh = new FaceMesh({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                }
            });

            this.faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.5
            });

            this.faceMesh.onResults((results) => {
                this.processResults(results);
            });

            this.isInitialized = true;
            console.log('Client-side MediaPipe initialized successfully');
        } catch (error) {
            console.error('Failed to initialize client-side MediaPipe:', error);
        }
    }

    processResults(results) {
        this.isProcessing = false;
        
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];
            this.lastResult = this.extractKeyLandmarks(landmarks, results.image.width, results.image.height);
        } else {
            this.lastResult = null;
        }
    }

    extractKeyLandmarks(landmarks, width, height) {
        // MediaPipe Face Mesh landmark indices
        const LANDMARK_INDICES = {
            left_eye_center: 33,
            right_eye_center: 362,
            nose_tip: 1,
            nose_bridge: 6,
            forehead_center: 10,
            chin_center: 175,
            left_eye_inner: 133,
            right_eye_inner: 362,
            left_eye_outer: 33,
            right_eye_outer: 263
        };

        const keyPoints = {};
        
        // Extract key landmarks
        for (const [name, index] of Object.entries(LANDMARK_INDICES)) {
            const landmark = landmarks[index];
            keyPoints[name] = {
                x: landmark.x * width,
                y: landmark.y * height,
                z: landmark.z || 0
            };
        }

        // Calculate measurements
        const leftEye = keyPoints.left_eye_center;
        const rightEye = keyPoints.right_eye_center;
        const eyeDistance = Math.sqrt(
            Math.pow(rightEye.x - leftEye.x, 2) + 
            Math.pow(rightEye.y - leftEye.y, 2)
        );

        const faceWidth = eyeDistance * 2.5;
        const faceHeight = Math.sqrt(
            Math.pow(keyPoints.chin_center.x - keyPoints.forehead_center.x, 2) + 
            Math.pow(keyPoints.chin_center.y - keyPoints.forehead_center.y, 2)
        );

        // Calculate eye center
        const eyeCenter = {
            x: (leftEye.x + rightEye.x) / 2,
            y: (leftEye.y + rightEye.y) / 2,
            z: (leftEye.z + rightEye.z) / 2
        };

        // Calculate face orientation
        const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
        const eyeCenterX = (leftEye.x + rightEye.x) / 2;
        const faceCenterOffset = keyPoints.nose_tip.x - eyeCenterX;
        const yaw = Math.atan(faceCenterOffset / 100);
        const eyeCenterY = (leftEye.y + rightEye.y) / 2;
        const noseOffset = keyPoints.nose_tip.y - eyeCenterY;
        const pitch = Math.atan(noseOffset / 100);

        // Calculate accessory positions
        const accessoryPositions = {
            glasses: {
                position: eyeCenter,
                scale: eyeDistance / 120,
                rotation_point: eyeCenter,
                width: eyeDistance * 1.4,
                height: eyeDistance * 0.6
            },
            hat: {
                position: {
                    x: keyPoints.forehead_center.x,
                    y: keyPoints.forehead_center.y - faceHeight * 0.2,
                    z: keyPoints.forehead_center.z
                },
                scale: faceWidth / 200,
                rotation_point: keyPoints.forehead_center,
                width: faceWidth,
                height: faceWidth * 0.6
            }
        };

        return {
            // Flatten the structure to match what the frontend expects
            left_eye: keyPoints.left_eye_center,
            right_eye: keyPoints.right_eye_center,
            nose_tip: keyPoints.nose_tip,
            nose_bridge: keyPoints.nose_bridge,
            forehead: keyPoints.forehead_center,
            chin: keyPoints.chin_center,
            face_width: faceWidth,
            face_height: faceHeight,
            eye_center: eyeCenter,
            confidence: 0.9,
            orientation: {
                roll: roll,
                yaw: yaw,
                pitch: pitch,
                roll_degrees: roll * 180 / Math.PI,
                yaw_degrees: yaw * 180 / Math.PI,
                pitch_degrees: pitch * 180 / Math.PI
            },
            accessory_positions: accessoryPositions,
            source: 'client_mediapipe',
            // Keep the nested structure for compatibility
            landmarks: keyPoints,
            measurements: {
                eye_distance: eyeDistance,
                face_height: faceHeight,
                face_width: faceWidth,
                eye_center: eyeCenter,
                aspect_ratio: faceWidth / faceHeight
            }
        };
    }

    async detectFace(videoElement) {
        if (!this.isInitialized || this.isProcessing || !videoElement || 
            videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) {
            return this.lastResult;
        }

        this.isProcessing = true;
        
        try {
            await this.faceMesh.send({ image: videoElement });
            return this.lastResult;
        } catch (error) {
            console.error('Client-side face detection error:', error);
            this.isProcessing = false;
            return null;
        }
    }

    startContinuousDetection(videoElement, callback, interval = 50) {
        if (!this.isInitialized) {
            console.warn('MediaPipe not initialized yet');
            return;
        }

        this.stopContinuousDetection();
        
        this.detectionInterval = setInterval(async () => {
            const landmarks = await this.detectFace(videoElement);
            if (callback && typeof callback === 'function') {
                callback(landmarks);
            }
        }, interval);
    }

    stopContinuousDetection() {
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }
    }
}
