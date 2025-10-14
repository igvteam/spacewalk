/**
 * Mobile Header Controller
 * Handles swipe-down gesture to show/hide the header on mobile
 */

class MobileHeaderController {
    constructor(headerElement) {
        this.header = headerElement;
        this.isVisible = false;
        this.hideTimeout = null;
        this.hideDelay = 5000; // Hide after 5 seconds of inactivity
        
        // Touch tracking
        this.touchStartY = 0;
        this.touchStartTime = 0;
        this.swipeThreshold = 50; // Minimum swipe distance in pixels
        this.swipeTimeThreshold = 300; // Maximum time for swipe in ms
        
        this.init();
    }
    
    init() {
        // Add touch event listeners to detect swipe down from top
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
        
        // Hide header when user interacts with the 3D viewer
        const viewer = document.getElementById('spacewalk-threejs-canvas-container');
        if (viewer) {
            viewer.addEventListener('touchstart', () => {
                if (this.isVisible) {
                    this.hide();
                }
            }, { passive: true });
        }
        
        // Hide header after entering URL
        const urlInput = document.getElementById('mobile-url-input');
        const loadButton = document.getElementById('mobile-load-button');
        
        if (urlInput) {
            urlInput.addEventListener('blur', () => {
                this.scheduleHide();
            });
        }
        
        if (loadButton) {
            loadButton.addEventListener('click', () => {
                this.scheduleHide(1000); // Hide after 1 second
            });
        }
    }
    
    handleTouchStart(e) {
        this.touchStartY = e.touches[0].clientY;
        this.touchStartTime = Date.now();
    }
    
    handleTouchMove(e) {
        // Optional: could show a preview as user swipes
    }
    
    handleTouchEnd(e) {
        if (!e.changedTouches || !e.changedTouches[0]) return;
        
        const touchEndY = e.changedTouches[0].clientY;
        const touchEndTime = Date.now();
        
        const swipeDistance = touchEndY - this.touchStartY;
        const swipeTime = touchEndTime - this.touchStartTime;
        
        // Detect swipe down from near top of screen
        const startedNearTop = this.touchStartY < 100;
        const isSwipeDown = swipeDistance > this.swipeThreshold;
        const isFastEnough = swipeTime < this.swipeTimeThreshold;
        
        if (startedNearTop && isSwipeDown && isFastEnough) {
            this.toggle();
        }
    }
    
    show() {
        if (!this.isVisible) {
            this.header.classList.add('visible');
            this.isVisible = true;
            this.scheduleHide();
        }
    }
    
    hide() {
        if (this.isVisible) {
            this.header.classList.remove('visible');
            this.isVisible = false;
            this.clearHideTimeout();
        }
    }
    
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    scheduleHide(delay = this.hideDelay) {
        this.clearHideTimeout();
        this.hideTimeout = setTimeout(() => {
            this.hide();
        }, delay);
    }
    
    clearHideTimeout() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
    }
    
    // Show header initially for a few seconds so user knows it's there
    showInitially() {
        this.show();
        this.scheduleHide(3000); // Hide after 3 seconds
    }
}

export default MobileHeaderController;

