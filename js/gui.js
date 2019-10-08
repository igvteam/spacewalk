import {appleCrayonColorThreeJS} from "./color.js";
import TraceSelectPanel from "./traceSelectPanel.js";
import JuiceboxPanel from "./juicebox/juiceboxPanel.js";
import ColorRampPanel, {colorRampPanelConfigurator} from "./colorRampPanel.js";
import DistanceMapPanel, { distanceMapPanelConfigurator } from "./distanceMapPanel.js";
import ContactFrequencyMapPanel, { contactFrequencyMapPanelConfigurator } from "./contactFrequencyMapPanel.js";
import IGVPanel, { igvBrowserConfigurator } from "./igv/IGVPanel.js";
import DataFileLoadModal, { spaceWalkFileLoadModalConfigurator, juiceboxFileLoadModalConfigurator } from "./dataFileLoadModal.js";
import { guiManager} from "./app.js";

let traceSelectPanel;
let juiceboxPanel;
let colorRampPanel;
let distanceMapPanel;
let contactFrequencyMapPanel;
let igvPanel;
let spaceWalkFileLoadModal;
let juiceboxFileLoadModal;

const highlightColor = appleCrayonColorThreeJS('honeydew');

const createGUI = container => {

    traceSelectPanel = new TraceSelectPanel({ container, panel: $('#spacewalk_trace_select_panel').get(0), isHidden: guiManager.isPanelHidden('spacewalk_trace_select_panel') });

    colorRampPanel = new ColorRampPanel( colorRampPanelConfigurator({ container, highlightColor }) );

    distanceMapPanel = new DistanceMapPanel(distanceMapPanelConfigurator(container));

    contactFrequencyMapPanel = new ContactFrequencyMapPanel(contactFrequencyMapPanelConfigurator(container));

    igvPanel = new IGVPanel({ container, panel: $('#spacewalk_igv_panel').get(0), isHidden: guiManager.isPanelHidden('spacewalk_igv_panel') });

    igvPanel.materialProvider = colorRampPanel.colorRampMaterialProvider;

    igvPanel.initialize(igvBrowserConfigurator());

    juiceboxPanel = new JuiceboxPanel({ container, panel: $('#spacewalk_juicebox_panel').get(0), isHidden: guiManager.isPanelHidden('spacewalk_juicebox_panel') });
    juiceboxPanel.initialize({container: $('#spacewalk_juicebox_root_container'), width: 400, height: 400});

    spaceWalkFileLoadModal = new DataFileLoadModal(spaceWalkFileLoadModalConfigurator());

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

export { showSpinner, hideSpinner, createGUI, traceSelectPanel, juiceboxPanel, colorRampPanel, distanceMapPanel, contactFrequencyMapPanel, igvPanel, highlightColor };
