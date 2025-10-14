/**
 * Entry point for Spacewalk mobile application.
 */
import MobileApp from "./mobileApp.js"
import MobileHeaderController from "./mobileHeaderController.js"
import '../styles/mobile.scss'
import { isWebGL2Supported } from "./utils/utils"

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
});

