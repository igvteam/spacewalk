import Panel, { doInspectPanelVisibilityCheckbox } from "../panel.js"
import IGVPanel from "../IGVPanel.js"
import JuiceboxPanel from "../juicebox/juiceboxPanel.js"
import LiveContactMapService, { defaultDistanceThreshold } from "../juicebox/liveContactMapService.js"
import LiveDistanceMapService from "../juicebox/liveDistanceMapService.js"
import configureContactMapLoaders from '../widgets/contactMapLoad.js'
import { spacewalkConfig } from "../../spacewalk-config.js"

/**
 * Initializer class responsible for setting up IGV and Juicebox panels
 * and their associated services.
 */
class PanelInitializer {
    constructor(appContext) {
        this.appContext = appContext;
    }

    /**
     * Initialize all panels and related services
     * @param {HTMLElement} container - Root container element
     * @returns {Object} Object containing initialized panels and services
     */
    async initialize(container) {
        const panelObjects = {};

        // Initialize IGV Panel (mini-app)
        panelObjects.igvPanel = new IGVPanel({
            container,
            panel: document.querySelector('#spacewalk_igv_panel'),
            isHidden: doInspectPanelVisibilityCheckbox('spacewalk_igv_panel'),
            colorRampMaterialProvider: this.appContext.colorRampMaterialProvider,
            trackMaterialProvider: this.appContext.trackMaterialProvider,
            ensembleManager: this.appContext.ensembleManager,
            genomicNavigator: this.appContext.genomicNavigator
        });
        panelObjects.igvPanel.materialProvider = this.appContext.colorRampMaterialProvider;
        // Populate module-level variable BEFORE initialization (event handlers may need it)
        if (this.appContext.appVariables) {
            this.appContext.appVariables.igvPanel = panelObjects.igvPanel;
        }
        await panelObjects.igvPanel.initialize(spacewalkConfig.igvConfig);

        // Initialize Juicebox Panel (mini-app)
        panelObjects.juiceboxPanel = new JuiceboxPanel({
            container,
            panel: document.getElementById('spacewalk_juicebox_panel'),
            isHidden: doInspectPanelVisibilityCheckbox('spacewalk_juicebox_panel')
        });
        // Populate module-level variable BEFORE initialization (event handlers need it)
        if (this.appContext.appVariables) {
            this.appContext.appVariables.juiceboxPanel = panelObjects.juiceboxPanel;
        }
        await panelObjects.juiceboxPanel.initialize(
            document.querySelector('#spacewalk_juicebox_root_container'),
            spacewalkConfig.juiceboxConfig
        );

        // NOW initialize live map services (these depend on panels being ready AND module-level variables populated)
        panelObjects.liveContactMapService = new LiveContactMapService(defaultDistanceThreshold);
        panelObjects.liveDistanceMapService = new LiveDistanceMapService();

        // Configure contact map loaders
        this.configureContactMapLoaders(panelObjects.juiceboxPanel);

        // Set up panel dictionary for inter-panel communication
        Panel.setPanelDictionary([panelObjects.igvPanel, panelObjects.juiceboxPanel]);

        return panelObjects;
    }

    configureContactMapLoaders(juiceboxPanel) {
        const contactMapLoadConfig = {
            rootContainer: document.getElementById('spacewalk-main'),
            localFileInput: document.querySelector('input[name="contact-map"]'),
            urlLoadModalId: 'hic-load-url-modal',
            dataModalId: 'hic-contact-map-modal',
            encodeHostedModalId: 'hic-encode-hosted-contact-map-modal',
            dropboxButton: document.getElementById('hic-contact-map-dropdown-dropbox-button'),
            googleDriveButton: document.getElementById('hic-contact-map-dropdown-google-drive-button'),
            googleEnabled: this.appContext.googleEnabled,
            mapMenu: spacewalkConfig.juiceboxConfig.contactMapMenu,
            loadHandler: (path, name, mapType) => juiceboxPanel.loadHicFile(path)
        };

        configureContactMapLoaders(contactMapLoadConfig);
    }
}

export default PanelInitializer;

