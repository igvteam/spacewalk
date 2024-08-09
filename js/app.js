import {BGZip, GoogleAuth, igvxhr} from 'igv-utils'
import AlertSingleton from './widgets/alertSingleton.js'
import {createSessionWidgets} from './widgets/sessionWidgets.js'
import { dropboxDropdownItem, googleDriveDropdownItem } from "./widgets/markupFactory.js"
import { createTrackWidgetsWithTrackRegistry } from './widgets/trackWidgets.js'
import SpacewalkEventBus from "./spacewalkEventBus.js";
import EnsembleManager from "./ensembleManager.js";
import ColorMapManager from "./colorMapManager.js";
import SceneManager, { sceneManagerConfigurator } from "./sceneManager.js";
import DataValueMaterialProvider from "./dataValueMaterialProvider.js";
import ColorRampMaterialProvider from "./colorRampMaterialProvider.js";
import Panel, { doInspectPanelVisibilityCheckbox }  from "./panel.js";
import PointCloud from "./pointCloud.js";
import Ribbon from "./ribbon.js";
import BallAndStick from "./ballAndStick.js";
import GUIManager from "./guiManager.js";
import ContactFrequencyMapPanel, {defaultDistanceThreshold} from "./contactFrequencyMapPanel.js";
import DistanceMapPanel, {distanceMapPanelConfigurator} from "./distanceMapPanel.js";
import TraceSelect from './traceSelect.js'
import TraceNavigator from './traceNavigator.js'
import IGVPanel from "./IGVPanel.js";
import JuiceboxPanel from "./juiceboxPanel.js";
import { appleCrayonColorRGB255, appleCrayonColorThreeJS, highlightColor } from "./color.js";
import {getUrlParams, loadSessionURL, toJSON, loadSession, uncompressSession} from "./spacewalkSession.js"
import { initializeMaterialLibrary } from "./materialLibrary.js";
import RenderContainerController from "./renderContainerController.js";
import {createSpacewalkFileLoaders} from './spacewalkFileLoad.js'
import BallHighlighter from "./ballHighlighter.js";
import PointCloudHighlighter from "./pointCloudHighlighter.js";
import configureContactMapLoaders from './contactMapLoad.js'
import {createShareWidgets, shareWidgetConfigurator} from './shareWidgets.js'
import { showGlobalSpinner, hideGlobalSpinner } from './utils.js'
import {showRelease} from "./release.js"
import { spacewalkConfig } from "../spacewalk-config.js";
import '../styles/app.scss'
import '../styles/igv/dom.scss'
import '../styles/juicebox.scss'

let pointCloud;
let ribbon;
let ballAndStick;
let ensembleManager;
let colorMapManager;
let sceneManager;
let dataValueMaterialProvider;
let colorRampMaterialProvider;
let guiManager
let distanceMapPanel
let contactFrequencyMapPanel
let juiceboxPanel
let igvPanel
let traceSelect
let traceNavigator
let renderContainerController
let googleEnabled = false

const SpacewalkGlobals =
    {
        defaultGenomeAssembly:'hg38'
    }

document.addEventListener("DOMContentLoaded", async (event) => {

    showGlobalSpinner()

    const container = document.getElementById('spacewalk-root-container');

    AlertSingleton.init(container)

    const { clientId, apiKey } = spacewalkConfig
    const enableGoogle = clientId && 'CLIENT_ID' !== clientId && (window.location.protocol === "https:" || window.location.host === "localhost")

    if (enableGoogle) {
        try {
            await GoogleAuth.init({ clientId, apiKey, scope: 'https://www.googleapis.com/auth/userinfo.profile' })
            await GoogleAuth.signOut()
            googleEnabled = true
        } catch (e) {
            console.error(e)
            AlertSingleton.present(e.message)
        }
    }

    const { tag_name } = await showRelease()
    document.getElementById('spacewalk-help-menu-release').innerHTML = `Spacewalk release ${ tag_name }`
    console.log(`Spacewalk release ${ tag_name }`)

    await initializationHelper(container)

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


    await initializeMaterialLibrary()

    pointCloud = new PointCloud({ pickHighlighter: new PointCloudHighlighter(), deemphasizedColor: appleCrayonColorThreeJS('magnesium') })

    ribbon = new Ribbon();

    ballAndStick = new BallAndStick({ pickHighlighter: new BallHighlighter(highlightColor) });

    ensembleManager = new EnsembleManager();

    colorMapManager = new ColorMapManager();
    await colorMapManager.configure();

    // dataValueMaterialProvider = new UnusedDataValueMaterialProvider({ width:8192, height:16, colorMinimum:appleCrayonColorRGB255('silver'), colorMaximum:appleCrayonColorRGB255('blueberry') })
    dataValueMaterialProvider = new DataValueMaterialProvider(appleCrayonColorRGB255('silver'), appleCrayonColorRGB255('blueberry'))

    colorRampMaterialProvider = new ColorRampMaterialProvider( { canvasContainer: document.querySelector('#spacewalk-trace-navigator-widget'), highlightColor } )

    sceneManager = new SceneManager(sceneManagerConfigurator(document.querySelector('#spacewalk-threejs-canvas-container')));

    const { sessionURL:igvSessionURL, session:juiceboxSessionURL, spacewalkSessionURL } = getUrlParams(window.location.href);

    let locusString
    let distanceThreshold = defaultDistanceThreshold
    if (spacewalkSessionURL) {
        const { locus, contactFrequencyMapDistanceThreshold } = JSON.parse( uncompressSession(spacewalkSessionURL) )
        locusString = `${ locus.chr }:${ locus.genomicStart }-${ locus.genomicEnd }`
        distanceThreshold = contactFrequencyMapDistanceThreshold
    }

    await createButtonsPanelsModals(container, igvSessionURL, juiceboxSessionURL, distanceThreshold, locusString);

    const settingsButton = document.querySelector('#spacewalk-threejs-settings-button-container')
    guiManager = new GUIManager({ settingsButton, $panel: $('#spacewalk_ui_manager_panel') });

    await loadSessionURL(spacewalkSessionURL)

    document.querySelector('.navbar').style.display = 'flex'

    renderContainerController = new RenderContainerController(container)

    renderLoop()

}

async function createButtonsPanelsModals(container, igvSessionURL, juiceboxSessionURL, distanceThreshold, locusString) {

    // $('.checkbox-menu').on("change", "input[type='checkbox']", () => $(this).closest("li").toggleClass("active", this.checked))

    // to support Viewers navbar item. Checkbox settings.
    // $(document).on('click', '.allow-focus', e => e.stopPropagation())

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

    const initializeDropbox = () => false

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

    igvPanel = new IGVPanel({ container, panel: $('#spacewalk_igv_panel').get(0), isHidden: doInspectPanelVisibilityCheckbox('spacewalk_igv_panel')})
    igvPanel.materialProvider = colorRampMaterialProvider;

    if (igvSessionURL) {
        const str = BGZip.uncompressString(igvSessionURL.substr(5))
        const sessionIGVConfig = JSON.parse(str)

        const { showTrackLabels, showRuler, showControls, showCursorTrackingGuide, queryParametersSupported } = spacewalkConfig.igvConfig
        const mergedConfig = { ...sessionIGVConfig, ...{ showTrackLabels, showRuler, showControls, showCursorTrackingGuide, queryParametersSupported } }

        await igvPanel.initialize(mergedConfig)
    } else {
        await igvPanel.initialize(spacewalkConfig.igvConfig)
    }

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

    if (juiceboxSessionURL) {
        const str = BGZip.uncompressString(juiceboxSessionURL.substr(5))
        const json = JSON.parse(str)
        json.locus = locusString
        spacewalkConfig.juiceboxConfig = Object.assign(spacewalkConfig.juiceboxConfig, json)
    }

    await juiceboxPanel.initialize(document.querySelector('#spacewalk_juicebox_root_container'), spacewalkConfig.juiceboxConfig)

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

    distanceMapPanel = new DistanceMapPanel(distanceMapPanelConfigurator({ container, isHidden: doInspectPanelVisibilityCheckbox('spacewalk_distance_map_panel')}));

    const contactFrequencyMapPanelConfiguration =
        {
            container,
            panel: document.querySelector('#spacewalk_contact_frequency_map_panel'),
            isHidden:doInspectPanelVisibilityCheckbox('spacewalk_contact_frequency_map_panel'),
            distanceThreshold
        }
    contactFrequencyMapPanel = new ContactFrequencyMapPanel(contactFrequencyMapPanelConfiguration)

    contactFrequencyMapPanel.initialize(contactFrequencyMapPanelConfiguration.panel)

    Panel.setPanelDictionary([ igvPanel, juiceboxPanel, distanceMapPanel, contactFrequencyMapPanel ]);

    $(window).on('resize.app', e => {

        // Prevent responding to resize event sent by jQuery resizable()
        const status = $(e.target).hasClass('ui-resizable');

        if (false === status) {
            let { width, height } = container.getBoundingClientRect();
            SpacewalkEventBus.globalBus.post({ type: 'AppWindowDidResize', data: { width, height } });
        }
    });


}

function renderLoop() {
    requestAnimationFrame( renderLoop )
    render()
}

function render () {
    sceneManager.renderLoopHelper()
}

export {
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
    distanceMapPanel,
    contactFrequencyMapPanel,
    igvPanel,
    traceNavigator }
