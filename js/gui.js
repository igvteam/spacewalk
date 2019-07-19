import {appleCrayonColorThreeJS} from "./color.js";
import GUIManager from "./guiManager.js";
import TraceSelectPanel from "./traceSelectPanel.js";
import JuiceboxPanel from "./juicebox/juiceboxPanel.js";
import ColorRampPanel, {colorRampPanelConfigurator} from "./colorRampPanel.js";
import ThumbnailPanel, { thumbnailPanelConfigurator } from "./thumbnailPanel.js";
import DistanceMapPanel, { distanceMapPanelConfigurator } from "./distanceMapPanel.js";
import ContactFrequencyMapPanel, { contactFrequencyMapPanelConfigurator } from "./contactFrequencyMapPanel.js";
import IGVPanel, { igvBrowserConfigurator, igvBrowserConfiguratorBigWig } from "./igv/IGVPanel.js";
import DataFileLoadModal, { swFileLoadModalConfigurator, pointCloudFileLoadModalConfigurator, juiceboxFileLoadModalConfigurator, structureFileLoadModalConfigurator } from "./dataFileLoadModal.js";
import Globals from './globals.js';

let guiManager;
let traceSelectPanel;
let juiceboxPanel;
let colorRampPanel;
let thumbnailPanel;
let distanceMapPanel;
let contactFrequencyMapPanel;
let igvPanel;

let swFileLoadModal;
let pointCloudFileLoadModal;
let structureFileLoadModal;
let juiceboxFileLoadModal;

const highlightColor = appleCrayonColorThreeJS('honeydew');

const createGUI = container => {

    guiManager = new GUIManager({ $button: $('#spacewalk_ui_manager_button'), $panel: $('#spacewalk_ui_manager_panel') });

    traceSelectPanel = new TraceSelectPanel({ container, panel: $('#spacewalk_trace_select_panel').get(0), isHidden: guiManager.isPanelHidden('spacewalk_trace_select_panel') });

    colorRampPanel = new ColorRampPanel( colorRampPanelConfigurator({ container, highlightColor }) );
    Globals.traceColorRampMaterialProvider = colorRampPanel.traceColorRampMaterialProvider;

    // thumbnailPanel = new ThumbnailPanel(thumbnailPanelConfigurator(container));

    distanceMapPanel = new DistanceMapPanel(distanceMapPanelConfigurator(container));

    contactFrequencyMapPanel = new ContactFrequencyMapPanel(contactFrequencyMapPanelConfigurator(container));

    igvPanel = new IGVPanel({ container, panel: $('#spacewalk_igv_panel').get(0) });
    igvPanel.initialize(igvBrowserConfigurator());
    // igvPanel.initialize(igvBrowserConfiguratorBigWig());

    juiceboxPanel = new JuiceboxPanel({ container, panel: $('#spacewalk_juicebox_panel').get(0) });
    juiceboxPanel.initialize({container: $('#spacewalk_juicebox_root_container'), width: 400, height: 400});

    swFileLoadModal = new DataFileLoadModal(swFileLoadModalConfigurator());

    pointCloudFileLoadModal = new DataFileLoadModal(pointCloudFileLoadModalConfigurator());

    structureFileLoadModal = new DataFileLoadModal(structureFileLoadModalConfigurator());

    juiceboxFileLoadModal = new DataFileLoadModal(juiceboxFileLoadModalConfigurator());

};

export { createGUI, guiManager, traceSelectPanel, juiceboxPanel, colorRampPanel, thumbnailPanel, distanceMapPanel, contactFrequencyMapPanel, igvPanel, highlightColor };
