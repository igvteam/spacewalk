import * as THREE from "three"
import CameraLightingRig from "./cameraLightingRig.js"
import Picker from "./picker.js"
import {GoogleAuth, igvxhr} from 'igv-utils'
import {createSessionWidgets} from './widgets/sessionWidgets.js'
import { createTrackWidgetsWithTrackRegistry } from './widgets/trackWidgets.js'
import SpacewalkEventBus from "./spacewalkEventBus.js";
import EnsembleManager from "./ensembleManager.js";
import ColorMapManager from "./utils/colorMapManager.js";
import SceneManager from "./sceneManager.js";
import TrackMaterialProvider from "./trackMaterialProvider.js";
import ColorRampMaterialProvider from "./colorRampMaterialProvider.js";
import Panel, { doInspectPanelVisibilityCheckbox }  from "./panel.js";
import PointCloud from "./pointCloud.js";
import Ribbon from "./ribbon.js";
import BallAndStick from "./ballAndStick.js";
import LiveContactMapService, {defaultDistanceThreshold} from "./juicebox/liveContactMapService.js";
import LiveDistanceMapService from "./juicebox/liveDistanceMapService.js";
import TraceSelector from './traceSelector.js'
import GenomicNavigator from './genomicNavigator.js'
import IGVPanel from "./IGVPanel.js";
import JuiceboxPanel from "./juicebox/juiceboxPanel.js";
import { appleCrayonColorRGB255, appleCrayonColorThreeJS, highlightColor, createColorPicker, updateColorPicker } from "./utils/colorUtils.js";
import {getUrlParams, toJSON, loadSession, uncompressSessionURL} from "./sessionServices.js"
import {createSpacewalkFileLoaders} from './spacewalkFileLoadWidgetServices.js'
import BallHighlighter from "./ballHighlighter.js";
import PointCloudHighlighter from "./pointCloudHighlighter.js";
import configureContactMapLoaders from './widgets/contactMapLoad.js'
import {createShareWidgets, shareWidgetConfigurator} from './share/shareWidgets.js'
import {showGlobalSpinner, hideGlobalSpinner, getMouseXY} from './utils/utils.js'
import {configureDrag} from "./utils/drag.js"
import ScaleBarService from "./scaleBarService.js"
import GUIManager from "./guiManager.js"
import { defaultColormapName } from "./utils/colorMapManager.js";
import {showRelease} from "./utils/release.js"
import { spacewalkConfig } from "../spacewalk-config.js";

const SpacewalkGlobals =
    {
        defaultGenomeAssembly:'hg38'
    }

/**
 * Main application class that encapsulates all Spacewalk application state.
 * This centralizes what were previously module-level variables into a cohesive object.
 *
 * @param {Object} appVariables - Optional object with setters to populate module-level variables for backward compatibility
 */
class SpacewalkApp {
    constructor(appVariables) {
        // Store reference to variable setters for backward compatibility
        this.appVariables = appVariables;

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

        // UI state
        this.mouseX = null;
        this.mouseY = null;
        this.aboutButtonPopover = null;
        this.helpButtonPopover = null;
        this.sceneBackgroundColorPicker = null;

        // Observers
        this.renderContainerResizeObserver = null;

        // Configuration
        this.googleEnabled = false;
    }

    async initialize() {
        showGlobalSpinner();

        this.googleEnabled = await this.configureGoogleAuthentication(spacewalkConfig);
        this.appVariables.googleEnabled = this.googleEnabled;

        this.ensembleManager = new EnsembleManager();
        this.appVariables.ensembleManager = this.ensembleManager;

        this.trackMaterialProvider = new TrackMaterialProvider(
            appleCrayonColorRGB255('snow'),
            appleCrayonColorRGB255('blueberry')
        );
        this.appVariables.trackMaterialProvider = this.trackMaterialProvider;

        this.colorMapManager = new ColorMapManager();
        await this.colorMapManager.configure();
        this.appVariables.colorMapManager = this.colorMapManager;

        this.colorRampMaterialProvider = new ColorRampMaterialProvider(defaultColormapName);
        this.appVariables.colorRampMaterialProvider = this.colorRampMaterialProvider;

        this.createThreeJSObjects(document.getElementById('spacewalk-threejs-canvas-container'));

        this.appVariables.pointCloud = this.pointCloud;
        this.appVariables.ribbon = this.ribbon;
        this.appVariables.ballAndStick = this.ballAndStick;
        this.appVariables.sceneManager = this.sceneManager;
        this.appVariables.picker = this.picker;
        this.appVariables.renderer = this.renderer;
        this.appVariables.cameraLightingRig = this.cameraLightingRig;
        this.appVariables.camera = this.camera;
        this.appVariables.scene = this.scene;
        this.appVariables.sceneBackgroundColorPicker = this.sceneBackgroundColorPicker;

        await this.createDOMElements(document.getElementById('spacewalk-root-container'));

        await this.consumeURLParams(getUrlParams(window.location.href));

        hideGlobalSpinner();

        this.startRenderLoop();
    }

    createThreeJSObjects(threeJSContainer) {
        // const stickMaterial = showSMaterial;
        // const stickMaterial = new THREE.MeshBasicMaterial({ color: appleCrayonColorThreeJS('aluminum') });
        const stickMaterial = new THREE.MeshPhongMaterial({ color: appleCrayonColorThreeJS('aluminum') });
        stickMaterial.side = THREE.DoubleSide;

        this.ribbon = new Ribbon();

        this.ballAndStick = new BallAndStick({
            pickHighlighter: new BallHighlighter(highlightColor),
            stickMaterial
        });

        this.pointCloud = new PointCloud({
            pickHighlighter: new PointCloudHighlighter(),
            deemphasizedColor: appleCrayonColorThreeJS('magnesium')
        });

        this.sceneManager = new SceneManager();

        this.picker = new Picker(new THREE.Raycaster());

        // Opt out of linear color workflow for now
        // https://discourse.threejs.org/t/updates-to-color-management-in-three-js-r152/50791
        // THREE.ColorManagement.enabled = false;

        // Enable linear color workflow
        THREE.ColorManagement.enabled = true;

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

        // Opt out of linear color workflow for now
        // https://discourse.threejs.org/t/updates-to-color-management-in-three-js-r152/50791
        // this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

        // Enable linear color workflow
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        // this.renderer.setClearColor (appleCrayonColorThreeJS('nickel'));
        // this.renderer.setClearColor (appleCrayonColorThreeJS('strawberry'));

        this.renderer.setPixelRatio(window.devicePixelRatio);

        const { width, height } = threeJSContainer.getBoundingClientRect();
        this.renderer.setSize(width, height);

        threeJSContainer.appendChild(this.renderer.domElement);

        threeJSContainer.addEventListener('mousemove', event => {
            const { x, y } = getMouseXY(this.renderer.domElement, event);
            this.mouseX = (x / this.renderer.domElement.clientWidth) * 2 - 1;
            this.mouseY = -(y / this.renderer.domElement.clientHeight) * 2 + 1;
        });

        this.scene = new THREE.Scene();
        this.scene.background = appleCrayonColorThreeJS('snow');

        const [fov, near, far, domElement, aspect] = [35, 1e2, 3e3, this.renderer.domElement, (width / height)];
        this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this.cameraLightingRig = new CameraLightingRig(this.renderer.domElement, this.camera);

        // Nice numbers
        const position = new THREE.Vector3(134820, 55968, 5715);
        const centroid = new THREE.Vector3(133394, 54542, 4288);
        this.cameraLightingRig.setPose(position, centroid);

        const pickerParent = document.querySelector(`div[data-colorpicker='background']`);
        this.sceneBackgroundColorPicker = createColorPicker(pickerParent, this.scene.background, color => {
            this.scene.background = new THREE.Color(color);
            this.renderer.render(this.scene, this.camera);
        });

        this.updateSceneBackgroundColorpicker(threeJSContainer, this.scene.background);
    }

    async createDOMElements(container) {
        const { tag_name } = await showRelease();
        document.getElementById('spacewalk-help-menu-release').innerHTML = `Spacewalk release ${tag_name}`;
        console.log(`Spacewalk release ${tag_name}`);

        // About button
        const aboutConfig = {
            trigger: 'focus',
            content: document.getElementById('spacewalk-about-button-content').innerHTML,
            html: true,
            template: '<div class="popover spacewalk-popover-about" role="tooltip"><div class="arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>'
        };

        const aboutButton = document.getElementById('spacewalk-about-button');
        this.aboutButtonPopover = new bootstrap.Popover(aboutButton, aboutConfig);

        // Help button
        const helpConfig = {
            trigger: 'focus',
            content: document.getElementById('spacewalk-help-button-content').innerHTML,
            html: true,
            template: '<div class="popover spacewalk-popover-help" role="tooltip"><div class="arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>'
        };
        const helpButton = document.getElementById('spacewalk-help-button');
        this.helpButtonPopover = new bootstrap.Popover(helpButton, helpConfig);

        this.scaleBarService = new ScaleBarService(
            document.querySelector('#spacewalk-threejs-canvas-container'),
            ScaleBarService.setScaleBarsHidden()
        );
        this.scaleBarService.insertScaleBarDOM();
        this.appVariables.scaleBarService = this.scaleBarService;

        const settingsButton = document.querySelector('#spacewalk-threejs-settings-button-container');
        this.guiManager = new GUIManager({
            settingsButton,
            panel: document.querySelector('#spacewalk_ui_manager_panel')
        });
        this.appVariables.guiManager = this.guiManager;

        this.traceSelector = new TraceSelector(document.querySelector('#spacewalk_trace_select_input'));
        this.appVariables.traceSelector = this.traceSelector;

        this.genomicNavigator = new GenomicNavigator(
            document.querySelector('#spacewalk-trace-navigator-container'),
            highlightColor
        );
        this.appVariables.genomicNavigator = this.genomicNavigator;

        const fileLoader = {
            load: async fileOrPath => {
                await this.sceneManager.ingestEnsemblePath(fileOrPath, '0', undefined);

                const data = this.ensembleManager.createEventBusPayload();
                SpacewalkEventBus.globalBus.post({ type: "DidLoadEnsembleFile", data });
            }
        };

        const spacewalkFileLoadConfig = {
            rootContainer: document.getElementById('spacewalk-main'),
            localFileInput: document.getElementById('spacewalk-sw-load-local-input'),
            urlLoadModalId: 'spacewalk-sw-load-url-modal',
            traceModalId: 'spacewalk-sw-load-select-modal',
            ensembleGroupModalId: 'spacewalk-ensemble-group-select-modal',
            dropboxButton: document.getElementById('spacewalk-sw-dropbox-button'),
            googleDriveButton: document.getElementById('spacewalk-sw-google-drive-button'),
            googleEnabled: this.googleEnabled,
            fileLoader
        };

        createSpacewalkFileLoaders(spacewalkFileLoadConfig);

        const initializeDropbox = () => true;

        createSessionWidgets(
            document.getElementById('spacewalk-main'),
            'spacewalk',
            'igv-app-dropdown-local-session-file-input',
            initializeDropbox,
            'igv-app-dropdown-dropbox-session-file-button',
            'igv-app-dropdown-google-drive-session-file-button',
            'spacewalk-session-url-modal',
            'spacewalk-session-save-modal',
            this.googleEnabled,
            async config => {
                const urlOrFile = config.url || config.file;
                const json = await igvxhr.loadJson(urlOrFile);
                await loadSession(json);
            },
            () => toJSON()
        );

        const trackMenuHandler = configList => {
            const idSet = new Set(
                this.igvPanel.browser.tracks
                    .filter(track => undefined !== track.id)
                    .map(track => track.id)
            );

            for (const { element, trackConfiguration } of configList) {
                const id = trackConfiguration.id === undefined ? trackConfiguration.name : trackConfiguration.id;
                if (idSet.has(id)) {
                    element.setAttribute('disabled', true);
                } else {
                    element.removeAttribute('disabled');
                }
            }
        };

        createTrackWidgetsWithTrackRegistry(
            document.getElementById('spacewalk_igv_panel'),
            document.getElementById('spacewalk-track-dropdown-menu'),
            document.getElementById('hic-local-track-file-input'),
            initializeDropbox,
            document.getElementById('spacewalk-track-dropbox-button'),
            this.googleEnabled,
            document.getElementById('spacewalk-track-dropdown-google-drive-button'),
            ['spacewalk-encode-signals-chip-modal', 'spacewalk-encode-signals-other-modal', 'spacewalk-encode-others-modal'],
            'spacewalk-track-load-url-modal',
            undefined,
            undefined,
            spacewalkConfig.trackRegistry,
            (configurations) => this.igvPanel.loadTrackList(configurations),
            trackMenuHandler
        );

        // Initialize IGV Panel (mini-app)
        this.igvPanel = new IGVPanel({
            container,
            panel: document.querySelector('#spacewalk_igv_panel'),
            isHidden: doInspectPanelVisibilityCheckbox('spacewalk_igv_panel')
        });
        this.igvPanel.materialProvider = this.colorRampMaterialProvider;
        // Populate module-level variable BEFORE initialization (event handlers in IGVPanel may need it)
        this.appVariables.igvPanel = this.igvPanel;
        await this.igvPanel.initialize(spacewalkConfig.igvConfig);

        // Initialize Juicebox Panel (mini-app)
        this.juiceboxPanel = new JuiceboxPanel({
            container,
            panel: document.getElementById('spacewalk_juicebox_panel'),
            isHidden: doInspectPanelVisibilityCheckbox('spacewalk_juicebox_panel')
        });
        // Populate module-level variable BEFORE initialization (event handlers in juiceboxPanel need it)
        this.appVariables.juiceboxPanel = this.juiceboxPanel;
        await this.juiceboxPanel.initialize(
            document.querySelector('#spacewalk_juicebox_root_container'),
            spacewalkConfig.juiceboxConfig
        );

        // Now that panels are fully initialized, create services that depend on them
        this.liveContactMapService = new LiveContactMapService(defaultDistanceThreshold);
        this.appVariables.liveContactMapService = this.liveContactMapService;

        this.liveDistanceMapService = new LiveDistanceMapService();
        this.appVariables.liveDistanceMapService = this.liveDistanceMapService;

        const contactMapLoadConfig = {
            rootContainer: document.getElementById('spacewalk-main'),
            localFileInput: document.querySelector('input[name="contact-map"]'),
            urlLoadModalId: 'hic-load-url-modal',
            dataModalId: 'hic-contact-map-modal',
            encodeHostedModalId: 'hic-encode-hosted-contact-map-modal',
            dropboxButton: document.getElementById('hic-contact-map-dropdown-dropbox-button'),
            googleDriveButton: document.getElementById('hic-contact-map-dropdown-google-drive-button'),
            googleEnabled: this.googleEnabled,
            mapMenu: spacewalkConfig.juiceboxConfig.contactMapMenu,
            loadHandler: (path, name, mapType) => this.juiceboxPanel.loadHicFile(path)
        };

        configureContactMapLoaders(contactMapLoadConfig);

        Panel.setPanelDictionary([this.igvPanel, this.juiceboxPanel]);

        createShareWidgets(shareWidgetConfigurator({ provider: 'tinyURL' }));

        // navbar is initially hidden for a less jarring appearance at app launch
        document.querySelector('.navbar').style.display = 'flex';

        configureDrag(
            document.getElementById('spacewalk-threejs-container'),
            document.getElementById('spacewalk-threejs-drag-container'),
            container,
            { topConstraint: document.querySelector('.navbar') }
        );

        configureDrag(
            document.getElementById('spacewalk_ui_manager_panel'),
            document.getElementById('spacewalk_ui_manager_panel'),
            container,
            { topConstraint: document.querySelector('.navbar') }
        );

        const traceContainer = document.getElementById('spacewalk-threejs-trace-navigator-container');

        this.configureRenderContainerResizeObserver(traceContainer);
        this.appVariables.renderContainerResizeObserver = this.renderContainerResizeObserver;

        this.configureFullscreenMode(traceContainer);
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

    configureRenderContainerResizeObserver(traceContainer) {
        this.renderContainerResizeObserver = new ResizeObserver(entries => {
            const { width, height } = this.getThreeJSContainerRect();
            this.renderer.setSize(width, height);
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.render();
        });

        this.renderContainerResizeObserver.observe(traceContainer);
    }

    configureFullscreenMode(traceContainer) {
        document.getElementById('spacewalk-fullscreen-button').addEventListener('click', () => {
            if (!document.fullscreenElement) {
                traceContainer.requestFullscreen().then(() => {
                    document.body.classList.add('fullscreen');
                }).catch(err => {
                    alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                });
            } else {
                document.exitFullscreen().then(() => {
                    document.body.classList.remove('fullscreen');
                }).catch(err => {
                    alert(`Error attempting to exit full-screen mode: ${err.message} (${err.name})`);
                });
            }
        });

        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) {
                document.body.classList.remove('fullscreen');
            }
        });
    }

    updateSceneBackgroundColorpicker(container, backgroundColor) {
        const { r, g, b } = backgroundColor;
        updateColorPicker(this.sceneBackgroundColorPicker, container, { r, g, b });
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

            this.picker.intersect({ x: this.mouseX, y: this.mouseY, scene: this.scene, camera: this.camera });

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

    getThreeJSContainerRect() {
        const container = document.querySelector('#spacewalk-threejs-canvas-container');
        return container.getBoundingClientRect();
    }
}

export { SpacewalkGlobals }
export default SpacewalkApp

