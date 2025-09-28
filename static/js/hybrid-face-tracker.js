class HybridFaceTracker {
    constructor() {
        this.djangoTracker = new DjangoFaceTracker();
        this.clientTracker = new ClientSideMediaPipe();
        this.lastDjangoResult = null;
        this.lastClientResult = null;
        this.useClientSide = true; // Prefer client-side for speed
        this.djangoInterval = null;
        this.clientInterval = null;
        this.callback = null;
        
        // Performance monitoring
        this.performanceStats = {
            djangoAvgTime: 0,
            clientAvgTime: 0,
            djangoCount: 0,
            clientCount: 0
        };
    }

    async detectFace(videoElement) {
        const startTime = performance.now();
        
        if (this.useClientSide && this.clientTracker.isInitialized) {
            // Use client-side MediaPipe for real-time tracking
            const result = await this.clientTracker.detectFace(videoElement);
            
            if (result) {
                this.lastClientResult = result;
                this.updatePerformanceStats('client', performance.now() - startTime);
                return result;
            }
        }
        
        // Fallback to Django backend or if client-side failed
        const result = await this.djangoTracker.detectFace(videoElement);
        if (result) {
            this.lastDjangoResult = result;
            this.updatePerformanceStats('django', performance.now() - startTime);
        }
        
        return result;
    }

    updatePerformanceStats(source, time) {
        if (source === 'client') {
            this.performanceStats.clientCount++;
            this.performanceStats.clientAvgTime = 
                (this.performanceStats.clientAvgTime * (this.performanceStats.clientCount - 1) + time) / 
                this.performanceStats.clientCount;
        } else {
            this.performanceStats.djangoCount++;
            this.performanceStats.djangoAvgTime = 
                (this.performanceStats.djangoAvgTime * (this.performanceStats.djangoCount - 1) + time) / 
                this.performanceStats.djangoCount;
        }

        // Log performance occasionally
        if ((this.performanceStats.clientCount + this.performanceStats.djangoCount) % 100 === 0) {
            console.log('Face Detection Performance:', {
                client: `${this.performanceStats.clientAvgTime.toFixed(1)}ms avg (${this.performanceStats.clientCount} calls)`,
                django: `${this.performanceStats.djangoAvgTime.toFixed(1)}ms avg (${this.performanceStats.djangoCount} calls)`
            });
        }
    }

    startContinuousDetection(videoElement, callback, interval = 50) {
        this.callback = callback;
        this.stopContinuousDetection();

        if (this.useClientSide && this.clientTracker.isInitialized) {
            // Start high-frequency client-side detection
            this.clientInterval = setInterval(async () => {
                const landmarks = await this.clientTracker.detectFace(videoElement);
                if (landmarks && this.callback) {
                    this.callback(landmarks);
                }
            }, interval);

            // Start lower-frequency Django detection for validation and backup
            this.djangoInterval = setInterval(async () => {
                const landmarks = await this.djangoTracker.detectFace(videoElement);
                if (landmarks) {
                    this.lastDjangoResult = landmarks;
                    // Optionally blend or validate results here
                }
            }, interval * 4); // 4x slower than client-side
        } else {
            // Fallback to Django-only detection
            this.djangoInterval = setInterval(async () => {
                const landmarks = await this.djangoTracker.detectFace(videoElement);
                if (landmarks && this.callback) {
                    this.callback(landmarks);
                }
            }, interval * 2); // Slower interval for Django-only
        }
    }

    stopContinuousDetection() {
        if (this.clientInterval) {
            clearInterval(this.clientInterval);
            this.clientInterval = null;
        }
        if (this.djangoInterval) {
            clearInterval(this.djangoInterval);
            this.djangoInterval = null;
        }
        this.clientTracker.stopContinuousDetection();
        this.djangoTracker.stopContinuousDetection();
    }

    // Method to switch between tracking modes
    setTrackingMode(mode) {
        this.stopContinuousDetection();
        
        switch (mode) {
            case 'client':
                this.useClientSide = true;
                console.log('Switched to client-side MediaPipe tracking');
                break;
            case 'django':
                this.useClientSide = false;
                console.log('Switched to Django backend tracking');
                break;
            case 'hybrid':
            default:
                this.useClientSide = true;
                console.log('Using hybrid tracking mode');
                break;
        }
    }

    // Get the best available result
    getBestResult() {
        if (this.lastClientResult && this.lastClientResult.confidence > 0.7) {
            return this.lastClientResult;
        }
        return this.lastDjangoResult;
    }

    // Delegate other methods to Django tracker
    async getDetectionHistory() {
        return await this.djangoTracker.getDetectionHistory();
    }

    async clearSession() {
        return await this.djangoTracker.clearSession();
    }

    getPerformanceStats() {
        return this.performanceStats;
    }
}
