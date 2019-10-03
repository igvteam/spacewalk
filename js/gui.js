import {appleCrayonColorThreeJS} from "./color.js";
import GUIManager from "./guiManager.js";
import TraceSelectPanel from "./traceSelectPanel.js";
import JuiceboxPanel from "./juicebox/juiceboxPanel.js";
import ColorRampPanel, {colorRampPanelConfigurator} from "./colorRampPanel.js";
import DistanceMapPanel, { distanceMapPanelConfigurator } from "./distanceMapPanel.js";
import ContactFrequencyMapPanel, { contactFrequencyMapPanelConfigurator } from "./contactFrequencyMapPanel.js";
import IGVPanel, { igvBrowserConfigurator } from "./igv/IGVPanel.js";
import DataFileLoadModal, { gsdbFileLoadModalConfigurator, spaceWalkFileLoadModalConfigurator, juiceboxFileLoadModalConfigurator } from "./dataFileLoadModal.js";

let guiManager;
let traceSelectPanel;
let juiceboxPanel;
let colorRampPanel;
let distanceMapPanel;
let contactFrequencyMapPanel;
let igvPanel;
let gsdbFileLoadModal;
let swFileLoadModal;
let juiceboxFileLoadModal;

const highlightColor = appleCrayonColorThreeJS('honeydew');

const createGUI = container => {

    guiManager = new GUIManager({ $button: $('#spacewalk_ui_manager_button'), $panel: $('#spacewalk_ui_manager_panel') });

    traceSelectPanel = new TraceSelectPanel({ container, panel: $('#spacewalk_trace_select_panel').get(0), isHidden: guiManager.isPanelHidden('spacewalk_trace_select_panel') });

    colorRampPanel = new ColorRampPanel( colorRampPanelConfigurator({ container, highlightColor }) );

    distanceMapPanel = new DistanceMapPanel(distanceMapPanelConfigurator(container));

    contactFrequencyMapPanel = new ContactFrequencyMapPanel(contactFrequencyMapPanelConfigurator(container));

    igvPanel = new IGVPanel({ container, panel: $('#spacewalk_igv_panel').get(0) });
    igvPanel.initialize(igvBrowserConfigurator());

    juiceboxPanel = new JuiceboxPanel({ container, panel: $('#spacewalk_juicebox_panel').get(0) });
    juiceboxPanel.initialize({container: $('#spacewalk_juicebox_root_container'), width: 400, height: 400});

    gsdbFileLoadModal = new DataFileLoadModal(gsdbFileLoadModalConfigurator());

    swFileLoadModal = new DataFileLoadModal(spaceWalkFileLoadModalConfigurator());

    juiceboxFileLoadModal = new DataFileLoadModal(juiceboxFileLoadModalConfigurator());

};

const showSpinner = () => {
    document.getElementById('spacewalk-spinner').style.display = 'block';
    console.log('show spinner');
};

const hideSpinner = () => {
    document.getElementById('spacewalk-spinner').style.display = 'none';
    console.log('hide spinner');
};

export { showSpinner, hideSpinner, createGUI, guiManager, traceSelectPanel, juiceboxPanel, colorRampPanel, distanceMapPanel, contactFrequencyMapPanel, igvPanel, highlightColor };
