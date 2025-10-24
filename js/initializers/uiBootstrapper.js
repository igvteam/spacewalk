import { igvxhr } from 'igv-utils'
import { createSessionWidgets } from '../widgets/sessionWidgets.js'
import { createTrackWidgetsWithTrackRegistry } from '../widgets/trackWidgets.js'
import SpacewalkEventBus from "../spacewalkEventBus.js"
import TraceSelector from '../traceSelector.js'
import GenomicNavigator from '../genomicNavigator.js'
import { highlightColor } from "../utils/colorUtils.js"
import { toJSON, loadSession } from "../sessionServices.js"
import { createSpacewalkFileLoaders } from '../spacewalkFileLoadWidgetServices.js'
import configureContactMapLoaders from '../widgets/contactMapLoad.js'
import { createShareWidgets, shareWidgetConfigurator } from '../share/shareWidgets.js'
import { configureDrag } from "../utils/drag.js"
import ScaleBarService from "../scaleBarService.js"
import GUIManager from "../guiManager.js"
import { showRelease } from "../utils/release.js"
import { spacewalkConfig } from "../../spacewalk-config.js"

/**
 * Initializer class responsible for bootstrapping all UI widgets and controls.
 */
class UIBootstrapper {
    constructor(appContext) {
        this.appContext = appContext;
    }

    /**
     * Initialize all UI components
     * @param {HTMLElement} container - Root container element
     * @returns {Object} Object containing initialized UI components
     */
    async initialize(container) {
        const uiComponents = {};

        // Display release information
        await this.initializeReleaseInfo();

        // Initialize popovers
        this.initializePopovers();

        // Initialize GUI manager first (creates the checkbox that ScaleBarService needs)
        const settingsButton = document.querySelector('#spacewalk-threejs-settings-button-container');
        uiComponents.guiManager = new GUIManager({
            settingsButton,
            panel: document.querySelector('#spacewalk_ui_manager_panel')
        });

        // Initialize scale bar service (after GUI manager, so checkbox exists)
        uiComponents.scaleBarService = new ScaleBarService(document.querySelector('#spacewalk-threejs-canvas-container'), ScaleBarService.setScaleBarsHidden());
        uiComponents.scaleBarService.insertScaleBarDOM();

        // Initialize trace selector and navigator
        uiComponents.traceSelector = new TraceSelector(document.querySelector('#spacewalk_trace_select_input'), this.appContext.ensembleManager);
        uiComponents.genomicNavigator = new GenomicNavigator(document.querySelector('#spacewalk-trace-navigator-container'), highlightColor, this.appContext.ensembleManager);

        // Initialize file loaders
        this.initializeFileLoaders();

        // Initialize session widgets
        this.initializeSessionWidgets();

        // Initialize drag functionality
        this.initializeDragControls(container);

        // Initialize share widgets
        createShareWidgets(shareWidgetConfigurator(spacewalkConfig.urlShortener));

        // Show navbar
        document.querySelector('.navbar').style.display = '';

        return uiComponents;
    }

    async initializeReleaseInfo() {
        const { tag_name } = await showRelease();
        document.getElementById('spacewalk-help-menu-release').innerHTML = `Spacewalk release ${tag_name}`;
        console.log(`Spacewalk release ${tag_name}`);
    }

    initializePopovers() {
        // About button popover
        const aboutConfig = {
            trigger: 'focus',
            content: document.getElementById('spacewalk-about-button-content').innerHTML,
            html: true,
            template: '<div class="popover spacewalk-popover-about" role="tooltip"><div class="arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>'
        };
        const aboutButton = document.getElementById('spacewalk-about-button');
        new bootstrap.Popover(aboutButton, aboutConfig);

        // Help button popover
        const helpConfig = {
            trigger: 'focus',
            content: document.getElementById('spacewalk-help-button-content').innerHTML,
            html: true,
            template: '<div class="popover spacewalk-popover-help" role="tooltip"><div class="arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>'
        };
        const helpButton = document.getElementById('spacewalk-help-button');
        new bootstrap.Popover(helpButton, helpConfig);
    }

    initializeFileLoaders() {
        const fileLoader = {
            load: async fileOrPath => {
                await this.appContext.sceneManager.ingestEnsemblePath(fileOrPath, '0', undefined);
                const data = this.appContext.ensembleManager.createEventBusPayload();
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
            fileLoader
        };

        createSpacewalkFileLoaders(spacewalkFileLoadConfig);
    }

    initializeSessionWidgets() {
        const initializeDropbox = () => true;

        createSessionWidgets(
            document.getElementById('spacewalk-main'),
            'spacewalk',
            'igv-main-dropdown-local-session-file-input',
            initializeDropbox,
            'igv-main-dropdown-dropbox-session-file-button',
            'spacewalk-session-url-modal',
            'spacewalk-session-save-modal',
            async config => {
                const urlOrFile = config.url || config.file;
                const json = await igvxhr.loadJson(urlOrFile);
                await loadSession(json);
            },
            () => toJSON()
        );
    }

    initializeDragControls(container) {
        const navbarConstraint = { topConstraint: document.querySelector('.navbar') };

        configureDrag(
            document.getElementById('spacewalk-threejs-container'),
            document.getElementById('spacewalk-threejs-drag-container'),
            container,
            navbarConstraint
        );

        configureDrag(
            document.getElementById('spacewalk_ui_manager_panel'),
            document.getElementById('spacewalk_ui_manager_panel'),
            container,
            navbarConstraint
        );
    }

    initializeFullscreenMode(traceContainer) {
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

    initializeTrackWidgets() {
        const initializeDropbox = () => true;

        const trackMenuHandler = configList => {
            const idSet = new Set(
                this.appContext.igvPanel.browser.tracks
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
            ['spacewalk-encode-signals-chip-modal', 'spacewalk-encode-signals-other-modal', 'spacewalk-encode-others-modal'],
            'spacewalk-track-load-url-modal',
            undefined,
            undefined,
            spacewalkConfig.trackRegistry,
            (configurations) => this.appContext.igvPanel.loadTrackList(configurations),
            trackMenuHandler
        );
    }

    initializeResizeObserver(traceContainer, threeJSObjects) {
        const renderContainerResizeObserver = new ResizeObserver(entries => {
            const container = document.querySelector('#spacewalk-threejs-canvas-container');
            const { width, height } = container.getBoundingClientRect();
            threeJSObjects.renderer.setSize(width, height);
            threeJSObjects.camera.aspect = width / height;
            threeJSObjects.camera.updateProjectionMatrix();
            // Trigger a render through the app context
            if (this.appContext.render) {
                this.appContext.render();
            }
        });

        renderContainerResizeObserver.observe(traceContainer);
        return renderContainerResizeObserver;
    }
}

export default UIBootstrapper;

