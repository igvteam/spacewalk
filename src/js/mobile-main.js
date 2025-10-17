/**
 * Entry point for Spacewalk mobile application.
 */
import MobileApp from "./mobileApp.js"
import { isWebGL2Supported } from "./utils/utils"
import MobileHeaderController from "./mobileHeaderController.js"
import MobileTraceSelector from "./mobileTraceSelector.js"
import MobileTraceSelectorController from "./mobileTraceSelectorController.js"
import '../styles/mobile.scss'

document.addEventListener("DOMContentLoaded", async (event) => {

    if (isWebGL2Supported()) {
        console.log("WebGL 2.0 is supported. Compute Like a Boss! 🎉");
    } else {
        console.log("WebGL 2.0 is NOT supported. 😢");
        alert("WebGL 2.0 is not supported on this device. Spacewalk requires WebGL 2.0 to run.");
        return;
    }

    // Initialize mobile header controller
    const header = document.getElementById('mobile-header');
    if (header) {
        const headerController = new MobileHeaderController(header);
        // Show header initially so user knows it's there
        headerController.showInitially();
    }

    const mobileApp = new MobileApp();
    await mobileApp.initialize();

    // Initialize mobile trace selector
    const traceSelectorElement = document.getElementById('mobile-trace-selector');
    const displayElement = document.getElementById('mobile-trace-selector-display');
    const minusButton = document.getElementById('mobile-trace-selector-minus');
    const plusButton = document.getElementById('mobile-trace-selector-plus');
    
    if (traceSelectorElement && displayElement && minusButton && plusButton) {
        // Create trace selector controller
        const traceSelectorController = new MobileTraceSelectorController(traceSelectorElement, mobileApp.ensembleManager);
        
        // Create trace selector
        const traceSelector = new MobileTraceSelector(displayElement, minusButton, plusButton, mobileApp.ensembleManager);
    }
});

