import SpacewalkEventBus from "./spacewalkEventBus.js"

/**
 * Mobile Trace Selector Controller
 * Handles swipe-up gesture to show/hide the trace selector widget on mobile
 */
class MobileTraceSelectorController {
    constructor(widgetElement, ensembleManager) {
        this.widget = widgetElement;
        this.ensembleManager = ensembleManager;
        this.isVisible = false;
        
        // Touch tracking
        this.touchStartY = 0;
        this.touchStartTime = 0;
        this.swipeThreshold = 50; // Minimum swipe distance in pixels
        this.swipeTimeThreshold = 300; // Maximum time for swipe in ms
        
        this.init();
    }
    
    init() {
        // Add touch event listeners to detect swipe up from bottom third
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
        
        // Hide widget when user taps away (clicks or touches outside widget)
        document.addEventListener('click', this.handleDocumentClick.bind(this));
        document.addEventListener('touchstart', this.handleDocumentTouch.bind(this), { passive: true });
        
        // Hide widget when new file loads
        SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this);
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
        
        const swipeDistance = this.touchStartY - touchEndY; // Reversed for bottom-up gestures
        const swipeTime = touchEndTime - this.touchStartTime;
        
        // Detect swipe gestures from bottom third of screen
        const screenHeight = window.innerHeight;
        const startedInBottomThird = this.touchStartY > (screenHeight * 2 / 3);
        const isFastEnough = swipeTime < this.swipeTimeThreshold;
        
        if (startedInBottomThird && isFastEnough) {
            if (swipeDistance > this.swipeThreshold) {
                // Swipe up - show widget
                this.show();
            } else if (swipeDistance < -this.swipeThreshold) {
                // Swipe down - hide widget
                this.hide();
            }
        }
    }
    
    handleDocumentClick(e) {
        const trigger = document.getElementById('mobile-trace-selector-trigger');
        const isTriggerClick = trigger && trigger.contains(e.target);
        
        if (isTriggerClick) {
            // Tap in trace selector trigger area - show widget
            this.show();
        } else if (this.isVisible && !this.widget.contains(e.target)) {
            // Tap outside widget - hide widget
            this.hide();
        }
    }
    
    handleDocumentTouch(e) {
        if (this.isVisible && !this.widget.contains(e.target)) {
            this.hide();
        }
    }
    
    receiveEvent({ type, data }) {
        if ("DidLoadEnsembleFile" === type) {
            // Hide widget when new file loads
            this.hide();
        }
    }
    
    show() {
        if (!this.isVisible) {
            this.widget.classList.add('visible');
            this.isVisible = true;
        }
    }
    
    hide() {
        if (this.isVisible) {
            this.widget.classList.remove('visible');
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
}

export default MobileTraceSelectorController;
