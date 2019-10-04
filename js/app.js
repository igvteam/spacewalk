import { appEventListener } from "./appEventListener.js";
import { guiManager, createGUI } from "./gui.js";
import Globals from "./globals.js";
import GSDB from "./gsdb.js";
import EventBus from "./eventBus.js";

let gsdb;

let globals;
const eventBus = new EventBus();

document.addEventListener("DOMContentLoaded", event => {

    const container = document.getElementById('spacewalk_canvas_container');

    globals = new Globals(container);
    globals.initialize(container);

    createGUI(container);

    globals.sceneManager.setRenderStyle( guiManager.getRenderStyle() );

    gsdb = new GSDB(globals.parser);

    $(window).on('resize.app', () => {
        let { width, height } = container.getBoundingClientRect();
        globals.appWindowWidth = width;
        globals.appWindowHeight = height;
        eventBus.post({ type: "AppWindowDidResize", data: { width, height } });
    });

    eventBus.subscribe('DidSelectTrace', appEventListener);
    eventBus.subscribe('DidLoadEnsembleFile', appEventListener);
    eventBus.subscribe('ToggleAllUIControls', appEventListener);
    eventBus.subscribe('RenderStyleDidChange', appEventListener);

    renderLoop();

});

let renderLoop = () => {
    requestAnimationFrame( renderLoop );
    globals.sceneManager.render();
};

export { eventBus, globals };
