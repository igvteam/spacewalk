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
import DataValueMaterialProvider from "./dataValueMaterialProvider.js";
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
import {configureRenderContainerDrag} from "./renderContainerDrag.js"
import ScaleBarService from "./scaleBarService.js"
import GUIManager from "./guiManager.js"
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
let traceSelector
let genomicNavigator
let googleEnabled = false
let renderContainerResizeObserver
let renderer
let cameraLightingRig
let camera
let scene
let picker
let mouseX
let mouseY
let aboutButtonPopover
let helpButtonPopover
let sceneBackgroundColorPicker
let scaleBarService

const SpacewalkGlobals =
    {
        defaultGenomeAssembly:'hg38'
    }

document.addEventListener("DOMContentLoaded", async (event) => {

    showGlobalSpinner()

    googleEnabled = await configureGoogleAuthentication(spacewalkConfig)

    await createDomainObjects()

    await createDOM(document.getElementById('spacewalk-root-container'))

    await consumeURLParams(getUrlParams(window.location.href))

    hideGlobalSpinner()

    renderLoop()

})

async function createDomainObjects() {

    // const stickMaterial = showSMaterial;
    // const stickMaterial = new THREE.MeshBasicMaterial({ color: appleCrayonColorThreeJS('aluminum') });
    const stickMaterial = new THREE.MeshPhongMaterial({ color: appleCrayonColorThreeJS('aluminum') })
    stickMaterial.side = THREE.DoubleSide

    ribbon = new Ribbon()

    ballAndStick = new BallAndStick({ pickHighlighter: new BallHighlighter(highlightColor), stickMaterial })

    pointCloud = new PointCloud({ pickHighlighter: new PointCloudHighlighter(), deemphasizedColor: appleCrayonColorThreeJS('magnesium') })

    ensembleManager = new EnsembleManager()

    colorMapManager = new ColorMapManager()
    await colorMapManager.configure()

    dataValueMaterialProvider = new DataValueMaterialProvider(appleCrayonColorRGB255('silver'), appleCrayonColorRGB255('blueberry'))

    colorRampMaterialProvider = new ColorRampMaterialProvider( { canvasContainer: document.querySelector('#spacewalk-trace-navigator-widget'), highlightColor } )

    const renderContainer = document.querySelector('#spacewalk-threejs-canvas-container')
    configureThreeJS(renderContainer)

    scaleBarService = new ScaleBarService(renderContainer)

}

async function createDOM(container) {

    const { tag_name } = await showRelease()
    document.getElementById('spacewalk-help-menu-release').innerHTML = `Spacewalk release ${ tag_name }`
    console.log(`Spacewalk release ${ tag_name }`)

    // About button
    const aboutConfig =
        {
            trigger: 'focus',
            content: document.getElementById('spacewalk-about-button-content').innerHTML,
            html: true,
            template: '<div class="popover spacewalk-popover-about" role="tooltip"><div class="arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>'
        }

    const aboutButton = document.getElementById('spacewalk-about-button')
    aboutButtonPopover = new bootstrap.Popover(aboutButton, aboutConfig)

    // Help button
    const helpConfig =
        {
            trigger: 'focus',
            content: document.getElementById('spacewalk-help-button-content').innerHTML,
            html: true,
            template: '<div class="popover spacewalk-popover-help" role="tooltip"><div class="arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>'
        }
    const helpButton = document.getElementById('spacewalk-help-button')
    helpButtonPopover = new bootstrap.Popover(helpButton, helpConfig)

    scaleBarService.insertScaleBarDOM()

    const settingsButton = document.querySelector('#spacewalk-threejs-settings-button-container')
    guiManager = new GUIManager({ settingsButton, panel: document.querySelector('#spacewalk_ui_manager_panel') });

    traceSelector = new TraceSelector(document.querySelector('#spacewalk_trace_select_input'))

    genomicNavigator = new GenomicNavigator(document.querySelector('#spacewalk-trace-navigator-container'))

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

    const initializeDropbox = () => true

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

    juiceboxPanel = new JuiceboxPanel({ container, panel: document.getElementById('spacewalk_juicebox_panel'), isHidden: doInspectPanelVisibilityCheckbox('spacewalk_juicebox_panel')});
    await juiceboxPanel.initialize(document.querySelector('#spacewalk_juicebox_root_container'), spacewalkConfig.juiceboxConfig)

    const contactMapLoadConfig =
        {
            rootContainer: document.getElementById('spacewalk-main'),
            localFileInput: document.querySelector('input[name="contact-map"]'),
            urlLoadModalId: 'hic-load-url-modal',
            dataModalId: 'hic-contact-map-modal',
            encodeHostedModalId: 'hic-encode-hosted-contact-map-modal',
            dropboxButton: document.getElementById('hic-contact-map-dropdown-dropbox-button'),
            googleDriveButton: document.getElementById('hic-contact-map-dropdown-google-drive-button'),
            googleEnabled,
            mapMenu: spacewalkConfig.juiceboxConfig.contactMapMenu,
            loadHandler: (path, name, mapType) => juiceboxPanel.loadHicFile(path)
        }

    configureContactMapLoaders(contactMapLoadConfig)

    liveContactMapService = new LiveContactMapService(defaultDistanceThreshold)

    liveDistanceMapService = new LiveDistanceMapService()

    Panel.setPanelDictionary([ igvPanel, juiceboxPanel ])

    createShareWidgets(shareWidgetConfigurator({ provider: 'tinyURL' }))

    // navbar is initially hidden for a less jarring appearance at app launch
    document.querySelector('.navbar').style.display = 'flex'

    configureRenderContainerDrag(document.querySelector('.navbar'), document.getElementById('spacewalk-root-container'))

    const _3DInteractionContainer = document.getElementById('spacewalk-threejs-trace-navigator-container')

    configureRenderContainerResizeObserver(_3DInteractionContainer, renderer)

    configureFullscreenMode(_3DInteractionContainer)

}

async function consumeURLParams(params){

    const { sessionURL:igvSessionURL, session:juiceboxSessionURL, spacewalkSessionURL } = params

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

    const result = 0 === Object.keys(acc).length ? undefined : acc

    if (result) {
        await loadSession(result)
    }

}

async function configureGoogleAuthentication(spacewalkConfig){

    const { clientId, apiKey } = spacewalkConfig
    const status = clientId && 'CLIENT_ID' !== clientId && (window.location.protocol === "https:" || window.location.host === "localhost")

    let isEnabled
    if (true === status) {
        try {
            await GoogleAuth.init({ clientId, apiKey, scope: 'https://www.googleapis.com/auth/userinfo.profile' })
            await GoogleAuth.signOut()
            isEnabled = true
        } catch (e) {
            console.error(e.message)
            alert(e.message)
            return isEnabled
        }
    }

    return isEnabled

}

function configureRenderContainerResizeObserver(_3DInteractionContainer, renderer){

    renderContainerResizeObserver = new ResizeObserver(entries => {
        const { width, height } = getRenderCanvasContainerRect()
        renderer.setSize(width, height)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
        render()
    })

    renderContainerResizeObserver.observe(_3DInteractionContainer)

}

function configureFullscreenMode(_3DInteractionContainer){

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
    })

    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            document.body.classList.remove('fullscreen');
        }
    });

}

function configureThreeJS(container) {

    sceneManager = new SceneManager()

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

    scene = new THREE.Scene()
    scene.background = appleCrayonColorThreeJS('snow')

    const [ fov, near, far, domElement, aspect ] = [ 35, 1e2, 3e3, renderer.domElement, (width/height) ]
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
    cameraLightingRig = new CameraLightingRig(renderer.domElement, camera)

    // Nice numbers
    const position = new THREE.Vector3(134820, 55968, 5715);
    const centroid = new THREE.Vector3(133394, 54542, 4288);
    cameraLightingRig.setPose(position, centroid);

    const pickerParent = document.querySelector(`div[data-colorpicker='background']`)
    sceneBackgroundColorPicker = createColorPicker(pickerParent, scene.background, color => {
        scene.background = new THREE.Color(color)
        renderer.render(scene, camera)
    })

    updateSceneBackgroundColorpicker(container, scene.background)

}

function updateSceneBackgroundColorpicker(container, backgroundColor){
    const { r, g, b } = backgroundColor
    updateColorPicker(sceneBackgroundColorPicker, container, {r, g, b})
}

function createHemisphereLight() {
    // Update due to r155 changes to illumination: Multiply light intensities by PI to get same brightness as previous threejs release.
    // See: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733
    const light = new THREE.HemisphereLight( appleCrayonColorThreeJS('snow'), appleCrayonColorThreeJS('tin'), Math.PI )
    light.name = 'hemisphereLight'
    return light
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

        picker.intersect({ x:mouseX, y:mouseY, scene, camera });

        renderer.render(scene, camera)

        const convexHull = SceneManager.getConvexHull(sceneManager.renderStyle)

        if (convexHull) {
            scaleBarService.scaleBarAnimationLoopHelper(convexHull.mesh, camera)
        }

    }

}

function renderLoop() {
    requestAnimationFrame( renderLoop )
    render()
}

function getRenderCanvasContainerRect() {
    const container = document.querySelector('#spacewalk-threejs-canvas-container')
    return container.getBoundingClientRect()
}

export {
    getRenderCanvasContainerRect,
    createHemisphereLight,
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
    dataValueMaterialProvider,
    guiManager,
    juiceboxPanel,
    liveContactMapService,
    liveDistanceMapService,
    igvPanel,
    genomicNavigator,
    scaleBarService}
