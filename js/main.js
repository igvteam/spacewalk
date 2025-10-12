/**
 * Main entry point for Spacewalk application.
 * Bootstraps the application when DOM is ready.
 */
import App, { appVariables } from "./app.js"
import 'juicebox.js/dist/css/juicebox.css'
import '../styles/app.scss'

document.addEventListener("DOMContentLoaded", async (event) => {
    const main = new App(appVariables);
    await main.initialize();
});
