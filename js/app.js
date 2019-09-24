import { appEventListener } from "./appEventListener.js";
import { guiManager, createGUI } from "./gui.js";
import Globals from "./globals.js";

let globals;

document.addEventListener("DOMContentLoaded", event => {

    const container = document.getElementById('spacewalk_canvas_container');

    globals = new Globals(container);
    globals.initialize(container);

    createGUI(container);

    globals.sceneManager.setRenderStyle( guiManager.getRenderStyle() );

    $(window).on('resize.app', () => {
        let { width, height } = container.getBoundingClientRect();
        globals.appWindowWidth = width;
        globals.appWindowHeight = height;
        globals.eventBus.post({ type: "AppWindowDidResize", data: { width, height } });
    });

    globals.eventBus.subscribe('DidSelectTrace', appEventListener);
    globals.eventBus.subscribe('DidLoadEnsembleFile', appEventListener);
    globals.eventBus.subscribe('ToggleAllUIControls', appEventListener);
    globals.eventBus.subscribe('RenderStyleDidChange', appEventListener);

    renderLoop();

});

let renderLoop = () => {
    requestAnimationFrame( renderLoop );
    globals.sceneManager.render();
};

export { globals };
