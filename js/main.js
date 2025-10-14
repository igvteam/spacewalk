/**
 * Entry point for Spacewalk application.
 */
import App from "./app.js"
import 'juicebox.js/dist/css/juicebox.css'
import '../styles/app.scss'
import {isWebGL2Supported} from "./utils/utils"

document.addEventListener("DOMContentLoaded", async (event) => {

    if (isWebGL2Supported()) {
        console.log("WebGL 2.0 is supported. Compute Like a Boss! 🎉");
    } else {
        console.log("WebGL 2.0 is NOT supported. 😢");
    }

    const main = new App();
    await main.initialize();
});
