import * as THREE from "three"
import CameraLightingRig from "./cameraLightingRig.js"
import Picker from "./picker.js"
import {GoogleAuth, igvxhr} from 'igv-utils'
import {createSessionWidgets} from './widgets/sessionWidgets.js'
import { dropboxDropdownItem, googleDriveDropdownItem } from "./widgets/markupFactory.js"
import { createTrackWidgetsWithTrackRegistry } from './widgets/trackWidgets.js'
import SpacewalkEventBus from "./spacewalkEventBus.js";
import EnsembleManager from "./ensembleManager.js";
import ColorMapManager from "./utils/colorMapManager.js";
import SceneManager from "./sceneManager.js";
import DataValueMaterialProvider from "./dataValueMaterialProvider.js";
import ColorRampMaterialProvider from "./colorRampMaterialProvider.js";
import Panel, { doInspectPanelVisibilityCheckbox }  from "./panel.js";
import PointCloud from "./pointCloud.js";
import Ribbon from "./ribbon.js";
import BallAndStick from "./ballAndStick.js";
import GUIManager from "./guiManager.js";
import LiveContactMapService, {defaultDistanceThreshold} from "./juicebox/liveContactMapService.js";
import LiveDistanceMapService from "./juicebox/liveDistanceMapService.js";
import TraceSelect from './traceSelect.js'
import TraceNavigator from './traceNavigator.js'
import IGVPanel from "./IGVPanel.js";
import JuiceboxPanel from "./juicebox/juiceboxPanel.js";
import { appleCrayonColorRGB255, appleCrayonColorThreeJS, highlightColor } from "./utils/colorUtils.js";
import {getUrlParams, toJSON, loadSession, uncompressSessionURL} from "./sessionServices.js"
import {createSpacewalkFileLoaders} from './spacewalkFileLoadWidgetServices.js'
import BallHighlighter from "./ballHighlighter.js";
import PointCloudHighlighter from "./pointCloudHighlighter.js";
import configureContactMapLoaders from './widgets/contactMapLoad.js'
import {createShareWidgets, shareWidgetConfigurator} from './share/shareWidgets.js'
import {showGlobalSpinner, hideGlobalSpinner, getMouseXY} from './utils/utils.js'
import {configureRenderContainerDrag} from "./renderContainerDrag.js"
import {showRelease} from "./utils/release.js"
import { spacewalkConfig } from "../spacewalk-config.js";
import 'juicebox.js/dist/css/juicebox.css'
import '../styles/app.scss'


let pointCloud;
let ribbon;
let ballAndStick;
let ensembleManager;
let colorMapManager;
let sceneManager;
let dataValueMaterialProvider;
let colorRampMaterialProvider;
let guiManager
let liveContactMapService
let liveDistanceMapService
let juiceboxPanel
let igvPanel
let traceSelect
let traceNavigator
let googleEnabled = false
let _3DInteractionContainerResizeObserver
let renderer
let cameraLightingRig
let scene
let picker
let mouseX
let mouseY

const SpacewalkGlobals =
    {
        defaultGenomeAssembly:'hg38'
    }

document.addEventListener("DOMContentLoaded", async (event) => {

    showGlobalSpinner()

    const container = document.getElementById('spacewalk-root-container');

    const { clientId, apiKey } = spacewalkConfig
    const enableGoogle = clientId && 'CLIENT_ID' !== clientId && (window.location.protocol === "https:" || window.location.host === "localhost")

    if (enableGoogle) {
        try {
            await GoogleAuth.init({ clientId, apiKey, scope: 'https://www.googleapis.com/auth/userinfo.profile' })
            await GoogleAuth.signOut()
            googleEnabled = true
        } catch (e) {
            console.error(e.message)
            alert(e.message)
        }
    }

    const { tag_name } = await showRelease()
    document.getElementById('spacewalk-help-menu-release').innerHTML = `Spacewalk release ${ tag_name }`
    console.log(`Spacewalk release ${ tag_name }`)

    await initializationHelper(container)

    const { sessionURL:igvSessionURL, session:juiceboxSessionURL, spacewalkSessionURL } = getUrlParams(window.location.href)

    const result = ingestSessionURLs({ igvSessionURL, juiceboxSessionURL, spacewalkSessionURL })

    if (result) {
        await loadSession(result)
    }

    hideGlobalSpinner()

})

const initializationHelper = async container => {

    // About button
    const aboutButtonContent = document.getElementById('spacewalk-about-button-content').innerHTML

    const aboutConfig =
        {
            content: aboutButtonContent,
            html: true,
            template: '<div class="popover spacewalk-popover-about" role="tooltip"><div class="arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>'
        }
    $('#spacewalk-about-button').popover(aboutConfig)

    // Help button
    const helpButtonContent = document.getElementById('spacewalk-help-button-content').innerHTML

    const helpConfig =
        {
            content: helpButtonContent,
            html: true,
            template: '<div class="popover spacewalk-popover-help" role="tooltip"><div class="arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>'
        }

    $('#spacewalk-help-button').popover(helpConfig)

    // Dismiss on click away from popover
    $('.popover-dismiss').popover({ trigger: 'focus' })

    pointCloud = new PointCloud({ pickHighlighter: new PointCloudHighlighter(), deemphasizedColor: appleCrayonColorThreeJS('magnesium') })

    ribbon = new Ribbon();

    // const stickMaterial = showSMaterial;
    // const stickMaterial = new THREE.MeshBasicMaterial({ color: appleCrayonColorThreeJS('aluminum') });
    const stickMaterial = new THREE.MeshPhongMaterial({ color: appleCrayonColorThreeJS('aluminum') });
    stickMaterial.side = THREE.DoubleSide;

    ballAndStick = new BallAndStick({ pickHighlighter: new BallHighlighter(highlightColor), stickMaterial });

    ensembleManager = new EnsembleManager();

    colorMapManager = new ColorMapManager();
    await colorMapManager.configure();

    dataValueMaterialProvider = new DataValueMaterialProvider(appleCrayonColorRGB255('silver'), appleCrayonColorRGB255('blueberry'))

    colorRampMaterialProvider = new ColorRampMaterialProvider( { canvasContainer: document.querySelector('#spacewalk-trace-navigator-widget'), highlightColor } )

    scene = threeJSSetup(document.querySelector('#spacewalk-threejs-canvas-container'))
    sceneManager = new SceneManager()

    await createButtonsPanelsModals(container, defaultDistanceThreshold);

    const settingsButton = document.querySelector('#spacewalk-threejs-settings-button-container')
    guiManager = new GUIManager({ settingsButton, panel: document.querySelector('#spacewalk_ui_manager_panel') });

    document.querySelector('.navbar').style.display = 'flex'

    const navbar = document.querySelector('.navbar')
    const { height } = navbar.getBoundingClientRect()

    const config =
        {
            target: document.getElementById('spacewalk-threejs-container'),
            handle: document.getElementById('spacewalk-threejs-drag-container'),
            container: document.getElementById('spacewalk-root-container'),
            topConstraint: height
        }

    configureRenderContainerDrag(config)

    const _3DInteractionContainer = document.getElementById('spacewalk-threejs-trace-navigator-container')

    _3DInteractionContainerResizeObserver = new ResizeObserver(entries => {
        const { width, height } = getRenderContainerSize()
        renderer.setSize(width, height)
        cameraLightingRig.object.aspect = width / height
        cameraLightingRig.object.updateProjectionMatrix()
        render()
    });

    _3DInteractionContainerResizeObserver.observe(_3DInteractionContainer)

    document.getElementById('spacewalk-fullscreen-button').addEventListener('click', () => {
        if (!document.fullscreenElement) {
            _3DInteractionContainer.requestFullscreen().then(() => {
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

    renderLoop()

}

async function createButtonsPanelsModals(container, distanceThreshold) {

    traceSelect = new TraceSelect()

    traceNavigator = new TraceNavigator(document.querySelector('#spacewalk-trace-navigator-container'))

    const fileLoader =
        {
            load: async fileOrPath => {
                await sceneManager.ingestEnsemblePath(fileOrPath, '0', undefined)

                const data = ensembleManager.createEventBusPayload()
                SpacewalkEventBus.globalBus.post({ type: "DidLoadEnsembleFile", data })
            }
        }

    const spacewalkFileLoadConfig =
        {
            rootContainer: document.getElementById('spacewalk-main'),
            localFileInput: document.getElementById('spacewalk-sw-load-local-input'),
            urlLoadModalId: 'spacewalk-sw-load-url-modal',
            traceModalId: 'spacewalk-sw-load-select-modal',
            ensembleGroupModalId: 'spacewalk-ensemble-group-select-modal',
            dropboxButton: document.getElementById('spacewalk-sw-dropbox-button'),
            googleDriveButton: document.getElementById('spacewalk-sw-google-drive-button'),
            googleEnabled,
            fileLoader
        };

    createSpacewalkFileLoaders(spacewalkFileLoadConfig)

    // const initializeDropbox = () => false
    const initializeDropbox = () => true

    const trackMenuHandler = configList => {

        const idSet = new Set(igvPanel.browser.tracks.filter(track => undefined !== track.id).map(track => track.id))

        for (const {element, trackConfiguration} of configList) {
            const id = trackConfiguration.id === undefined ? trackConfiguration.name : trackConfiguration.id
            if (idSet.has(id)) {
                element.setAttribute('disabled', true)
            } else {
                element.removeAttribute('disabled')
            }
        }

    }

    createTrackWidgetsWithTrackRegistry(document.getElementById('spacewalk_igv_panel'),
        document.getElementById('spacewalk-track-dropdown-menu'),
        document.getElementById('hic-local-track-file-input'),
        initializeDropbox,
        document.getElementById('spacewalk-track-dropbox-button'),
        googleEnabled,
        document.getElementById('spacewalk-track-dropdown-google-drive-button'),
        ['spacewalk-encode-signals-chip-modal', 'spacewalk-encode-signals-other-modal', 'spacewalk-encode-others-modal'],
        'spacewalk-track-load-url-modal',
        undefined,
        undefined,
        spacewalkConfig.trackRegistry,
        (configurations) => igvPanel.loadTrackList(configurations),
        trackMenuHandler)

    igvPanel = new IGVPanel({ container, panel: document.querySelector('#spacewalk_igv_panel'), isHidden: doInspectPanelVisibilityCheckbox('spacewalk_igv_panel')})
    igvPanel.materialProvider = colorRampMaterialProvider;

    await igvPanel.initialize(spacewalkConfig.igvConfig)

    // Session - Dropbox and Google Drive buttons
    $('div#spacewalk-session-dropdown-menu > :nth-child(1)').after(dropboxDropdownItem('igv-app-dropdown-dropbox-session-file-button'));
    $('div#spacewalk-session-dropdown-menu > :nth-child(2)').after(googleDriveDropdownItem('igv-app-dropdown-google-drive-session-file-button'));

    createSessionWidgets(document.getElementById('spacewalk-main'),
        'spacewalk',
        'igv-app-dropdown-local-session-file-input',
        initializeDropbox,
        'igv-app-dropdown-dropbox-session-file-button',
        'igv-app-dropdown-google-drive-session-file-button',
        'spacewalk-session-url-modal',
        'spacewalk-session-save-modal',
        googleEnabled,
        async config => {
            const urlOrFile = config.url || config.file
            const json = await igvxhr.loadJson(urlOrFile)
            await loadSession(json)
        },
        () => toJSON())

    juiceboxPanel = new JuiceboxPanel({ container, panel: $('#spacewalk_juicebox_panel').get(0), isHidden: doInspectPanelVisibilityCheckbox('spacewalk_juicebox_panel')});
    await juiceboxPanel.initialize(document.querySelector('#spacewalk_juicebox_root_container'), spacewalkConfig.juiceboxConfig)

    liveContactMapService = new LiveContactMapService(distanceThreshold)

    const $dropdownButton = $('#spacewalk-contact-map-dropdown')
    const $dropdowns = $dropdownButton.parent()

    const contactMapLoadConfig =
        {
            rootContainer: document.querySelector('#spacewalk-main'),
            $dropdowns,
            $localFileInputs: $dropdowns.find('input'),
            urlLoadModalId: 'hic-load-url-modal',
            dataModalId: 'hic-contact-map-modal',
            encodeHostedModalId: 'hic-encode-hosted-contact-map-modal',
            $dropboxButtons: $dropdowns.find('div[id$="-map-dropdown-dropbox-button"]'),
            $googleDriveButtons: $dropdowns.find('div[id$="-map-dropdown-google-drive-button"]'),
            googleEnabled,
            mapMenu: spacewalkConfig.juiceboxConfig.contactMapMenu,
            loadHandler: (path, name, mapType) => juiceboxPanel.loadHicFile(path)
        }

    configureContactMapLoaders(contactMapLoadConfig)

    createShareWidgets(shareWidgetConfigurator({ provider: 'tinyURL' }))

    liveDistanceMapService = new LiveDistanceMapService()

    Panel.setPanelDictionary([ igvPanel, juiceboxPanel ]);

}

function threeJSSetup(container) {

    const str = `Scene Manager Configuration Builder Complete`;
    console.time(str);

    picker = new Picker( new THREE.Raycaster() );

    // Opt out of linear color workflow for now
    // https://discourse.threejs.org/t/updates-to-color-management-in-three-js-r152/50791
    // THREE.ColorManagement.enabled = false;

    // Enable linear color workflow
    THREE.ColorManagement.enabled = true;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    // Opt out of linear color workflow for now
    // https://discourse.threejs.org/t/updates-to-color-management-in-three-js-r152/50791
    // renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

    // Enable linear color workflow
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // renderer.setClearColor (appleCrayonColorThreeJS('nickel'));
    // renderer.setClearColor (appleCrayonColorThreeJS('strawberry'));

    renderer.setPixelRatio(window.devicePixelRatio);

    const { width, height } = container.getBoundingClientRect();
    renderer.setSize(width, height);

    container.appendChild(renderer.domElement);

    container.addEventListener('mousemove', event => {
        const { x, y } = getMouseXY(renderer.domElement, event);
        mouseX =  ( x / renderer.domElement.clientWidth  ) * 2 - 1;
        mouseY = -( y / renderer.domElement.clientHeight ) * 2 + 1;
    })

    const background = appleCrayonColorThreeJS('snow');
    // const background = sceneBackgroundTexture;

    const scene = new THREE.Scene();
    scene.background = background;

    // Update due to r155 changes to illumination: Multiply light intensities by PI to get same brightness as previous threejs release.
    // See: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733
    const hemisphereLight = new THREE.HemisphereLight( appleCrayonColorThreeJS('snow'), appleCrayonColorThreeJS('tin'), Math.PI );

    const [ fov, near, far, domElement, aspect ] = [ 35, 1e2, 3e3, renderer.domElement, (width/height) ];
    cameraLightingRig = new CameraLightingRig({ fov, near, far, domElement, aspect, hemisphereLight });

    // Nice numbers
    const position = new THREE.Vector3(134820, 55968, 5715);
    const centroid = new THREE.Vector3(133394, 54542, 4288);
    cameraLightingRig.setPose(position, centroid);

    cameraLightingRig.addToScene(scene);

    console.timeEnd(str);

    return scene

}

function render () {

    if (sceneManager.isGood2Go()) {
        pointCloud.renderLoopHelper()

        ballAndStick.renderLoopHelper()

        ribbon.renderLoopHelper()

        colorRampMaterialProvider.renderLoopHelper()

        cameraLightingRig.renderLoopHelper();

        sceneManager.getGroundPlane().renderLoopHelper()

        sceneManager.getGnomon().renderLoopHelper()

        picker.intersect({ x:mouseX, y:mouseY, scene, camera:cameraLightingRig.object });

        renderer.render(scene, cameraLightingRig.object)

    }

}

function renderLoop() {
    requestAnimationFrame( renderLoop )
    render()
}

function getRenderContainerSize() {
    const container = document.querySelector('#spacewalk-threejs-canvas-container')
    return container.getBoundingClientRect()
}

function ingestSessionURLs({ igvSessionURL, juiceboxSessionURL, spacewalkSessionURL }) {

    let acc = {}

    // spacewalk
    if (spacewalkSessionURL) {
        const spacewalk = JSON.parse(uncompressSessionURL(spacewalkSessionURL))
        acc = { ...acc, spacewalk }
    }

    // juicebox
    if (juiceboxSessionURL) {
        const juicebox = JSON.parse(uncompressSessionURL(juiceboxSessionURL))
        acc = { ...acc, juicebox }
    }

    // igv
    if (igvSessionURL) {
        const igv = JSON.parse(uncompressSessionURL(igvSessionURL))
        acc = { ...acc, igv }
    }

    return 0 === Object.keys(acc).length ? undefined : acc

}

export {
    getRenderContainerSize,
    scene,
    renderer,
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
    dataValueMaterialProvider,
    guiManager,
    juiceboxPanel,
    liveContactMapService,
    liveDistanceMapService,
    igvPanel,
    traceNavigator }
