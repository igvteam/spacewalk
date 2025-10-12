import App from "./app.js"
import 'juicebox.js/dist/css/juicebox.css'
import '../styles/app.scss'

// Module-level variables for backward compatibility
// These will be populated during main initialization
let pointCloud;
let ribbon;
let ballAndStick;
let ensembleManager;
let sceneManager;
let trackMaterialProvider;
let colorRampMaterialProvider;
let liveContactMapService;
let liveDistanceMapService;
let juiceboxPanel;
let igvPanel;
let genomicNavigator;
let googleEnabled = false;
let cameraLightingRig;
let camera;
let scene;
let sceneBackgroundColorPicker;
let scaleBarService;

/**
 * Helper object for App to populate module-level variables during initialization.
 * This maintains backward compatibility while allowing proper timing for dependent modules.
 */
const appVariables = {
    set pointCloud(val) { pointCloud = val; },
    set ribbon(val) { ribbon = val; },
    set ballAndStick(val) { ballAndStick = val; },
    set ensembleManager(val) { ensembleManager = val; },
    set sceneManager(val) { sceneManager = val; },
    set trackMaterialProvider(val) { trackMaterialProvider = val; },
    set colorRampMaterialProvider(val) { colorRampMaterialProvider = val; },
    set liveContactMapService(val) { liveContactMapService = val; },
    set liveDistanceMapService(val) { liveDistanceMapService = val; },
    set juiceboxPanel(val) { juiceboxPanel = val; },
    set igvPanel(val) { igvPanel = val; },
    set genomicNavigator(val) { genomicNavigator = val; },
    set googleEnabled(val) { googleEnabled = val; },
    set cameraLightingRig(val) { cameraLightingRig = val; },
    set camera(val) { camera = val; },
    set scene(val) { scene = val; },
    set sceneBackgroundColorPicker(val) { sceneBackgroundColorPicker = val; },
    set scaleBarService(val) { scaleBarService = val; },
};

// Main application instance - created after DOM is ready
let main;

document.addEventListener("DOMContentLoaded", async (event) => {
    // Create and initialize the application
    main = new App(appVariables);
    // Module-level variables are populated inline during initialization via appVariables setters
    await main.initialize();
});

function getThreeJSContainerRect() {
    const container = document.querySelector('#spacewalk-threejs-canvas-container');
    return container.getBoundingClientRect();
}

export {
    getThreeJSContainerRect,
    scene,
    camera,
    sceneBackgroundColorPicker,
    cameraLightingRig,
    googleEnabled,
    pointCloud,
    ribbon,
    ballAndStick,
    ensembleManager,
    sceneManager,
    colorRampMaterialProvider,
    trackMaterialProvider,
    juiceboxPanel,
    liveContactMapService,
    liveDistanceMapService,
    igvPanel,
    genomicNavigator,
    scaleBarService
}
