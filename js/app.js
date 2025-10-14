import { GoogleAuth } from 'igv-utils'
import EnsembleManager from "./ensembleManager.js"
import ColorMapManager from "./utils/colorMapManager.js"
import TrackMaterialProvider from "./trackMaterialProvider.js"
import ColorRampMaterialProvider from "./colorRampMaterialProvider.js"
import { appleCrayonColorRGB255 } from "./utils/colorUtils.js"
import { getUrlParams, loadSession, uncompressSessionURL } from "./sessionServices.js"
import { showGlobalSpinner, hideGlobalSpinner } from './utils/utils.js'
import { defaultColormapName } from "./utils/colorMapManager.js"
import { spacewalkConfig } from "../spacewalk-config.js"
import SceneManager from "./sceneManager.js"
import ThreeJSInitializer from "./initializers/threeJSInitializer.js"
import UIBootstrapper from "./initializers/uiBootstrapper.js"
import PanelInitializer from "./initializers/panelInitializer.js"

// Module-level variables - the single source of truth for shared application state
// These are populated by the App class during initialization
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

function getThreeJSContainerRect() {
    const container = document.querySelector('#spacewalk-threejs-canvas-container');
    return container.getBoundingClientRect();
}

/**
 * Main application class that orchestrates Spacewalk initialization and manages application state.
 * Populates module-level variables for backward compatibility with existing code.
 */
class App {
    constructor() {

        // Visualization objects
        this.pointCloud = null;
        this.ribbon = null;
        this.ballAndStick = null;

        // Core managers
        this.ensembleManager = null;
        this.colorMapManager = null;
        this.sceneManager = null;
        this.trackMaterialProvider = null;
        this.colorRampMaterialProvider = null;
        this.guiManager = null;

        // Services
        this.liveContactMapService = null;
        this.liveDistanceMapService = null;
        this.scaleBarService = null;

        // Panels
        this.juiceboxPanel = null;
        this.igvPanel = null;

        // Navigation and selection
        this.traceSelector = null;
        this.genomicNavigator = null;

        // Three.js core objects
        this.renderer = null;
        this.cameraLightingRig = null;
        this.camera = null;
        this.scene = null;
        this.picker = null;
        this.sceneBackgroundColorPicker = null;

        // Observers
        this.renderContainerResizeObserver = null;

        // Configuration
        this.googleEnabled = false;

        // Initializers
        this.threeJSInitializer = null;
        this.uiBootstrapper = null;
        this.panelInitializer = null;
    }

    async initialize() {
        showGlobalSpinner();

        // Configure Google authentication
        this.googleEnabled = await this.configureGoogleAuthentication(spacewalkConfig);
        googleEnabled = this.googleEnabled;

        // Initialize core managers
        await this.initializeCoreManagers();

        // Initialize Three.js scene, camera, and renderer
        const container = document.getElementById('spacewalk-threejs-canvas-container')
        const colorPickerContainer = document.querySelector(`div[data-colorpicker='background']`)
        this.threeJSInitializer = new ThreeJSInitializer(container, colorPickerContainer);
        const threeJSObjects = this.threeJSInitializer.initialize(this.colorRampMaterialProvider);
        this.assignThreeJSObjects(threeJSObjects);

        // Initialize UI components
        this.uiBootstrapper = new UIBootstrapper(this);
        const uiComponents = await this.uiBootstrapper.initialize(document.getElementById('spacewalk-root-container'));
        this.assignUIComponents(uiComponents);

        // Initialize track widgets (needs to be done after UI but before panels)
        this.uiBootstrapper.initializeTrackWidgets();

        // Initialize panels and their services
        this.panelInitializer = new PanelInitializer(this);
        const panelObjects = await this.panelInitializer.initialize(document.getElementById('spacewalk-root-container'));
        this.assignPanelObjects(panelObjects);

        // Configure resize observer and fullscreen mode
        const traceContainer = document.getElementById('spacewalk-threejs-trace-navigator-container');
        this.renderContainerResizeObserver = this.uiBootstrapper.initializeResizeObserver(traceContainer, threeJSObjects);
        this.uiBootstrapper.initializeFullscreenMode(traceContainer);

        // Load session from URL parameters if present
        await this.consumeURLParams(getUrlParams(window.location.href));

        hideGlobalSpinner();

        // Start the render loop
        this.startRenderLoop();
    }

    async initializeCoreManagers() {
        this.ensembleManager = new EnsembleManager();
        ensembleManager = this.ensembleManager;

        this.trackMaterialProvider = new TrackMaterialProvider(appleCrayonColorRGB255('snow'), appleCrayonColorRGB255('blueberry'), this.ensembleManager);
        trackMaterialProvider = this.trackMaterialProvider;

        this.colorMapManager = new ColorMapManager();
        await this.colorMapManager.configure();

        this.colorRampMaterialProvider = new ColorRampMaterialProvider(defaultColormapName, this.colorMapManager);
        colorRampMaterialProvider = this.colorRampMaterialProvider;
    }

    assignThreeJSObjects(threeJSObjects) {
        this.pointCloud = threeJSObjects.pointCloud;
        this.ribbon = threeJSObjects.ribbon;
        this.ballAndStick = threeJSObjects.ballAndStick;
        this.sceneManager = threeJSObjects.sceneManager;
        this.picker = threeJSObjects.picker;
        this.renderer = threeJSObjects.renderer;
        this.cameraLightingRig = threeJSObjects.cameraLightingRig;
        this.camera = threeJSObjects.camera;
        this.scene = threeJSObjects.scene;
        this.sceneBackgroundColorPicker = threeJSObjects.sceneBackgroundColorPicker;

        // Populate module-level variables
        pointCloud = this.pointCloud;
        ribbon = this.ribbon;
        ballAndStick = this.ballAndStick;
        sceneManager = this.sceneManager;
        cameraLightingRig = this.cameraLightingRig;
        camera = this.camera;
        scene = this.scene;
        sceneBackgroundColorPicker = this.sceneBackgroundColorPicker;
    }

    assignUIComponents(uiComponents) {
        this.scaleBarService = uiComponents.scaleBarService;
        this.guiManager = uiComponents.guiManager;
        this.traceSelector = uiComponents.traceSelector;
        this.genomicNavigator = uiComponents.genomicNavigator;

        // Populate module-level variables
        scaleBarService = this.scaleBarService;
        genomicNavigator = this.genomicNavigator;
    }

    /**
     * Early population of panel variables (called during panel initialization for timing)
     */
    populatePanelVariable(name, value) {
        this[name] = value;
        // Populate module-level variable immediately
        if (name === 'igvPanel') {
            igvPanel = value;
        } else if (name === 'juiceboxPanel') {
            juiceboxPanel = value;
        }
    }

    assignPanelObjects(panelObjects) {
        // Panels were already assigned via populatePanelVariable
        this.liveContactMapService = panelObjects.liveContactMapService;
        this.liveDistanceMapService = panelObjects.liveDistanceMapService;

        // Populate module-level variables
        liveContactMapService = this.liveContactMapService;
        liveDistanceMapService = this.liveDistanceMapService;
    }

    async consumeURLParams(params) {
        const { sessionURL: igvSessionURL, session: juiceboxSessionURL, spacewalkSessionURL } = params;

        let acc = {};

    // spacewalk
    if (spacewalkSessionURL) {
            const spacewalk = JSON.parse(uncompressSessionURL(spacewalkSessionURL));
            acc = { ...acc, spacewalk };
    }

    // juicebox
    if (juiceboxSessionURL) {
            const juicebox = JSON.parse(uncompressSessionURL(juiceboxSessionURL));
            acc = { ...acc, juicebox };
    }

    // igv
    if (igvSessionURL) {
            const igv = JSON.parse(uncompressSessionURL(igvSessionURL));
            acc = { ...acc, igv };
    }

        const result = 0 === Object.keys(acc).length ? undefined : acc;

    if (result) {
            await loadSession(result);
        }
    }

    async configureGoogleAuthentication(spacewalkConfig) {
        const { clientId, apiKey } = spacewalkConfig;
        const status = clientId && 'CLIENT_ID' !== clientId &&
            (window.location.protocol === "https:" || window.location.host === "localhost");

        let isEnabled;
        if (true === status) {
            try {
                await GoogleAuth.init({
                    clientId,
                    apiKey,
                    scope: 'https://www.googleapis.com/auth/userinfo.profile'
                });
                await GoogleAuth.signOut();
                isEnabled = true;
            } catch (e) {
                console.error(e.message);
                alert(e.message);
                return isEnabled;
            }
        }

        return isEnabled;
    }

    render() {
        if (this.sceneManager.isGood2Go()) {
            this.pointCloud.renderLoopHelper();
            this.ballAndStick.renderLoopHelper();
            this.ribbon.renderLoopHelper();
            this.genomicNavigator.renderLoopHelper();
            this.cameraLightingRig.renderLoopHelper();
            this.sceneManager.getGroundPlane().renderLoopHelper();
            this.sceneManager.getGnomon().renderLoopHelper();

            // Get mouse coordinates from ThreeJS initializer
            const { x, y } = this.threeJSInitializer.getMouseCoordinates();
            this.picker.intersect({ x, y, scene: this.scene, camera: this.camera });

            this.renderer.render(this.scene, this.camera);

            const convexHull = SceneManager.getConvexHull(this.sceneManager.renderStyle);

        if (convexHull) {
                this.scaleBarService.scaleBarAnimationLoopHelper(convexHull.mesh, this.camera);
            }
        }
    }

    startRenderLoop() {
        const renderLoop = () => {
            requestAnimationFrame(renderLoop);
            this.render();
        };
        renderLoop();
    }
}

export default App

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
