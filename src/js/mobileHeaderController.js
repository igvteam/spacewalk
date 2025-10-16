/**
 * Mobile Header Controller
 * Handles swipe-down gesture to show/hide the header on mobile
 */

class MobileHeaderController {
    constructor(headerElement) {
        this.header = headerElement;
        this.isVisible = false;
        
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
        
        // Trigger area handled by document click listener
        
        // Hide header when user taps away (clicks or touches outside header)
        document.addEventListener('click', this.handleDocumentClick.bind(this));
        document.addEventListener('touchstart', this.handleDocumentTouch.bind(this), { passive: true });
        
        // Hide header after load button is clicked
        const loadButton = document.getElementById('mobile-load-button');
        if (loadButton) {
            loadButton.addEventListener('click', () => {
                this.hide();
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
        
        // Detect swipe gestures from near top of screen
        const startedNearTop = this.touchStartY < 100;
        const isFastEnough = swipeTime < this.swipeTimeThreshold;
        
        if (startedNearTop && isFastEnough) {
            if (swipeDistance > this.swipeThreshold) {
                // Swipe down - show header
                this.show();
            } else if (swipeDistance < -this.swipeThreshold) {
                // Swipe up - hide header
                this.hide();
            }
        }
    }
    
    handleDocumentClick(e) {
        const trigger = document.getElementById('mobile-header-trigger');
        const isTriggerClick = trigger && trigger.contains(e.target);
        
        if (isTriggerClick) {
            // Tap in header trigger area - show header
            this.show();
        } else if (this.isVisible && !this.header.contains(e.target)) {
            // Tap outside header - hide header
            this.hide();
        }
    }
    
    handleDocumentTouch(e) {
        if (this.isVisible && !this.header.contains(e.target)) {
            this.hide();
        }
    }
    
    show() {
        if (!this.isVisible) {
            this.header.classList.add('visible');
            this.isVisible = true;
        }
    }
    
    hide() {
        if (this.isVisible) {
            this.header.classList.remove('visible');
            this.isVisible = false;
        }
    }
    
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    // Show header initially so user knows it's there
    showInitially() {
        // Only show initially on mobile (not desktop)
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            this.show();
        }
    }
}

export default MobileHeaderController;

