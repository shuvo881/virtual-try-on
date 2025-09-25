/**
 * Core JavaScript utilities for Virtual Try-On application
 */

// Global utilities
window.VirtualTryOn = {
    // CSRF token helper
    getCsrfToken: function() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrftoken') {
                return value;
            }
        }
        return '';
    },

    // API request helper
    apiRequest: async function(url, options = {}) {
        const defaultOptions = {
            headers: {
                'X-CSRFToken': this.getCsrfToken(),
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        // Don't set Content-Type for FormData
        if (options.body instanceof FormData) {
            delete defaultOptions.headers['Content-Type'];
        }

        const response = await fetch(url, {
            ...defaultOptions,
            ...options
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    },

    // Show notification
    showNotification: function(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: 'bold',
            zIndex: '10000',
            maxWidth: '300px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });

        // Set background color based on type
        const colors = {
            info: '#3498db',
            success: '#2ecc71',
            warning: '#f39c12',
            error: '#e74c3c'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    },

    // Loading overlay
    showLoading: function(message = 'Loading...') {
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-message">${message}</div>
            </div>
        `;

        // Style the overlay
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '10001',
            backdropFilter: 'blur(5px)'
        });

        // Add spinner styles
        const style = document.createElement('style');
        style.textContent = `
            .loading-content {
                text-align: center;
                color: white;
            }
            .loading-spinner {
                width: 50px;
                height: 50px;
                border: 4px solid rgba(255,255,255,0.3);
                border-top: 4px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }
            .loading-message {
                font-size: 18px;
                font-weight: bold;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(overlay);
        return overlay;
    },

    hideLoading: function() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    },

    // Utility to check if device supports WebGL
    checkWebGLSupport: function() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
        } catch (e) {
            return false;
        }
    },

    // Utility to check camera support
    checkCameraSupport: function() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    },

    // Initialize the application
    init: function() {
        console.log('Virtual Try-On Core initialized');
        
        // Check browser compatibility
        if (!this.checkWebGLSupport()) {
            this.showNotification('WebGL is not supported in your browser. 3D features may not work.', 'warning');
        }

        if (!this.checkCameraSupport()) {
            this.showNotification('Camera access is not supported in your browser.', 'error');
        }

        // Add global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.showNotification('An unexpected error occurred. Please refresh the page.', 'error');
        });

        // Add unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showNotification('An error occurred while processing your request.', 'error');
        });
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    VirtualTryOn.init();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VirtualTryOn;
}
