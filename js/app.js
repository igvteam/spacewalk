import SpacewalkApp from "./spacewalkApp.js"
import { SpacewalkGlobals } from "./spacewalkApp.js";
import 'juicebox.js/dist/css/juicebox.css'
import '../styles/app.scss'

// Module-level variables for backward compatibility
// These will be populated during app initialization
let pointCloud;
let ribbon;
let ballAndStick;
let ensembleManager;
let colorMapManager;
let sceneManager;
let trackMaterialProvider;
let colorRampMaterialProvider;
let guiManager;
let liveContactMapService;
let liveDistanceMapService;
let juiceboxPanel;
let igvPanel;
let traceSelector;
let genomicNavigator;
let googleEnabled = false;
let renderContainerResizeObserver;
let renderer;
let cameraLightingRig;
let camera;
let scene;
let picker;
let sceneBackgroundColorPicker;
let scaleBarService;

/**
 * Helper object for SpacewalkApp to populate module-level variables during initialization.
 * This maintains backward compatibility while allowing proper timing for dependent modules.
 */
const appVariables = {
    set pointCloud(val) { pointCloud = val; },
    set ribbon(val) { ribbon = val; },
    set ballAndStick(val) { ballAndStick = val; },
    set ensembleManager(val) { ensembleManager = val; },
    set colorMapManager(val) { colorMapManager = val; },
    set sceneManager(val) { sceneManager = val; },
    set trackMaterialProvider(val) { trackMaterialProvider = val; },
    set colorRampMaterialProvider(val) { colorRampMaterialProvider = val; },
    set guiManager(val) { guiManager = val; },
    set liveContactMapService(val) { liveContactMapService = val; },
    set liveDistanceMapService(val) { liveDistanceMapService = val; },
    set juiceboxPanel(val) { juiceboxPanel = val; },
    set igvPanel(val) { igvPanel = val; },
    set traceSelector(val) { traceSelector = val; },
    set genomicNavigator(val) { genomicNavigator = val; },
    set googleEnabled(val) { googleEnabled = val; },
    set renderContainerResizeObserver(val) { renderContainerResizeObserver = val; },
    set renderer(val) { renderer = val; },
    set cameraLightingRig(val) { cameraLightingRig = val; },
    set camera(val) { camera = val; },
    set scene(val) { scene = val; },
    set picker(val) { picker = val; },
    set sceneBackgroundColorPicker(val) { sceneBackgroundColorPicker = val; },
    set scaleBarService(val) { scaleBarService = val; },
};

// Create singleton instance of the application with access to variable setters
const app = new SpacewalkApp(appVariables);

document.addEventListener("DOMContentLoaded", async (event) => {
    // Initialize the application
    // Module-level variables are populated inline during initialization via appVariables setters
    await app.initialize();
});

// Wrapper functions for backward compatibility with exported functions
function updateSceneBackgroundColorpicker(container, backgroundColor) {
    return app.updateSceneBackgroundColorpicker(container, backgroundColor);
}

function getThreeJSContainerRect() {
    return app.getThreeJSContainerRect();
}

export {
    getThreeJSContainerRect,
    scene,
    camera,
    sceneBackgroundColorPicker,
    updateSceneBackgroundColorpicker,
    cameraLightingRig,
    SpacewalkGlobals,
    googleEnabled,
    pointCloud,
    ribbon,
    ballAndStick,
    ensembleManager,
    colorMapManager,
    sceneManager,
    colorRampMaterialProvider,
    trackMaterialProvider,
    guiManager,
    juiceboxPanel,
    liveContactMapService,
    liveDistanceMapService,
    igvPanel,
    genomicNavigator,
    scaleBarService}
