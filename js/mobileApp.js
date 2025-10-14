import EnsembleManager from "./ensembleManager.js"
import ColorMapManager from "./utils/colorMapManager.js"
import TrackMaterialProvider from "./trackMaterialProvider.js"
import ColorRampMaterialProvider from "./colorRampMaterialProvider.js"
import { appleCrayonColorRGB255 } from "./utils/colorUtils.js"
import { getUrlParams, loadSession, uncompressSessionURL } from "./sessionServices.js"
import { showGlobalSpinner, hideGlobalSpinner } from './utils/utils.js'
import { defaultColormapName } from "./utils/colorMapManager.js"
import MobileSceneManager from "./mobileSceneManager.js"
import ThreeJSInitializer from "./initializers/threeJSInitializer.js"
import MobileUIBootstrapper from "./initializers/mobileUIBootstrapper.js"
import GenomicNavigator from "./genomicNavigator.js"
import { highlightColor } from "./utils/colorUtils.js"
import { updateGlobals } from "./appGlobals.js"

/**
 * Mobile application class - streamlined version of App for mobile devices.
 * Only includes 3D viewer and genomic navigator functionality.
 */
class MobileApp {
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

        // Navigation
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

        // Initializers
        this.threeJSInitializer = null;
        this.mobileUIBootstrapper = null;
    }

    async initialize() {
        showGlobalSpinner();

        // Initialize core managers
        await this.initializeCoreManagers();

        // Initialize Three.js scene, camera, and renderer
        const container = document.getElementById('spacewalk-threejs-canvas-container')
        // Mobile doesn't need background color picker in UI - use null
        this.threeJSInitializer = new ThreeJSInitializer(container, null);
        const threeJSObjects = this.threeJSInitializer.initialize(this.colorRampMaterialProvider);
        
        // Override sceneManager with mobile version
        threeJSObjects.sceneManager = new MobileSceneManager(this.colorRampMaterialProvider);
        
        this.assignThreeJSObjects(threeJSObjects);

        // Initialize minimal mobile UI components
        this.mobileUIBootstrapper = new MobileUIBootstrapper(this);
        const mobileUIComponents = await this.mobileUIBootstrapper.initialize();
        this.assignMobileUIComponents(mobileUIComponents);

        // Configure resize observer
        const traceContainer = document.getElementById('spacewalk-threejs-trace-navigator-container');
        this.renderContainerResizeObserver = this.mobileUIBootstrapper.initializeResizeObserver(traceContainer, threeJSObjects);

        // Load session from URL parameters if present
        await this.consumeURLParams(getUrlParams(window.location.href));

        hideGlobalSpinner();

        // Start the render loop
        this.startRenderLoop();
    }

    async initializeCoreManagers() {
        this.ensembleManager = new EnsembleManager();
        this.trackMaterialProvider = new TrackMaterialProvider(
            appleCrayonColorRGB255('snow'), 
            appleCrayonColorRGB255('blueberry'), 
            this.ensembleManager
        );
        this.colorMapManager = new ColorMapManager();
        await this.colorMapManager.configure();
        this.colorRampMaterialProvider = new ColorRampMaterialProvider(defaultColormapName, this.colorMapManager);
        
        // Update globals
        updateGlobals({
            ensembleManager: this.ensembleManager,
            trackMaterialProvider: this.trackMaterialProvider,
            colorRampMaterialProvider: this.colorRampMaterialProvider
        });
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

        // Update globals
        updateGlobals({
            pointCloud: this.pointCloud,
            ribbon: this.ribbon,
            ballAndStick: this.ballAndStick,
            sceneManager: this.sceneManager,
            cameraLightingRig: this.cameraLightingRig,
            camera: this.camera,
            scene: this.scene,
            sceneBackgroundColorPicker: this.sceneBackgroundColorPicker
        });
    }

    assignMobileUIComponents(mobileUIComponents) {
        this.genomicNavigator = mobileUIComponents.genomicNavigator;
        
        // Update globals
        updateGlobals({
            genomicNavigator: this.genomicNavigator
        });
    }

    async consumeURLParams(params) {
        const { sessionURL: igvSessionURL, session: juiceboxSessionURL, spacewalkSessionURL } = params;

        let acc = {};

        // spacewalk
        if (spacewalkSessionURL) {
            const spacewalk = JSON.parse(uncompressSessionURL(spacewalkSessionURL));
            acc = { ...acc, spacewalk };
        }

        // juicebox (ignored on mobile but keep for compatibility)
        if (juiceboxSessionURL) {
            const juicebox = JSON.parse(uncompressSessionURL(juiceboxSessionURL));
            acc = { ...acc, juicebox };
        }

        // igv (ignored on mobile but keep for compatibility)
        if (igvSessionURL) {
            const igv = JSON.parse(uncompressSessionURL(igvSessionURL));
            acc = { ...acc, igv };
        }

        const result = 0 === Object.keys(acc).length ? undefined : acc;

        if (result) {
            await loadSession(result);
        }
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

            // Get mouse/touch coordinates from ThreeJS initializer
            const { x, y } = this.threeJSInitializer.getMouseCoordinates();
            this.picker.intersect({ x, y, scene: this.scene, camera: this.camera });

            this.renderer.render(this.scene, this.camera);
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

export default MobileApp

// Re-export from appGlobals for backward compatibility
export {
    getThreeJSContainerRect,
    scene,
    camera,
    sceneBackgroundColorPicker,
    cameraLightingRig,
    pointCloud,
    ribbon,
    ballAndStick,
    ensembleManager,
    sceneManager,
    colorRampMaterialProvider,
    trackMaterialProvider,
    genomicNavigator
} from "./appGlobals.js"

