class DjangoFaceTracker {
    constructor() {
        this.isDetecting = false;
        this.lastDetection = null;
        this.detectionInterval = null;
        this.csrfToken = this.getCsrfToken();
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
    
    async detectFace(videoElement) {
        if (this.isDetecting || !videoElement || videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) {
            return this.lastDetection;
        }
        
        this.isDetecting = true;
        
        try {
            // Capture frame from video
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoElement, 0, 0);
            
            // Convert to blob
            const blob = await new Promise(resolve => 
                canvas.toBlob(resolve, 'image/jpeg', 0.8)
            );
            
            // Send to Django backend
            const formData = new FormData();
            formData.append('image', blob, 'frame.jpg');
            
            const response = await fetch('/api/face/detect/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': this.csrfToken
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Use the comprehensive MediaPipe data including accessory positions
                const landmarks = {
                    left_eye: result.landmarks.left_eye_center,
                    right_eye: result.landmarks.right_eye_center,
                    nose_tip: result.landmarks.nose_tip,
                    nose_bridge: result.landmarks.nose_bridge,
                    forehead: result.landmarks.forehead_center,
                    chin: result.landmarks.chin_center,
                    face_width: result.measurements.face_width,
                    face_height: result.measurements.face_height,
                    eye_center: result.measurements.eye_center,
                    confidence: result.confidence,
                    orientation: result.orientation,
                    accessory_positions: result.accessory_positions // This is the key improvement!
                };

                this.lastDetection = landmarks;
                return landmarks;
            } else {
                this.lastDetection = null;
                return null;
            }
            
        } catch (error) {
            console.error('Face detection error:', error);
            return null;
        } finally {
            this.isDetecting = false;
        }
    }
    
    startContinuousDetection(videoElement, callback, interval = 100) {
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
    
    async getDetectionHistory() {
        try {
            const response = await fetch('/api/face/history/', {
                headers: {
                    'X-CSRFToken': this.csrfToken
                }
            });
            const result = await response.json();
            return result.detections || [];
        } catch (error) {
            console.error('Error fetching detection history:', error);
            return [];
        }
    }
    
    async clearSession() {
        try {
            const response = await fetch('/api/face/clear-session/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.csrfToken
                }
            });
            const result = await response.json();
            return result.success || false;
        } catch (error) {
            console.error('Error clearing session:', error);
            return false;
        }
    }
}