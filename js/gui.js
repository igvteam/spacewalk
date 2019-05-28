import {appleCrayonColorThreeJS} from "./color.js";
import GUIManager from "./guiManager.js";
import TraceSelectPanel from "./traceSelectPanel.js";
import JuiceboxPanel from "./juicebox/juiceboxPanel.js";
import ColorRampPanel, {colorRampPanelConfigurator} from "./colorRampPanel.js";
import ThumbnailPanel, {thumbnailPanelConfigurator} from "./thumbnailPanel.js";
import DistanceMapPanel, {distanceMapPanelConfigurator} from "./distanceMapPanel.js";
import IGVPanel, { trackRegistryFile, igvBrowserConfigurator } from "./igv/IGVPanel.js";
import TrackLoadController, { trackLoadControllerConfigurator } from "./igv/trackLoadController.js";
import DataFileLoadModal, { juiceboxFileLoadModalConfigurator, structureFileLoadModalConfigurator } from "./dataFileLoadModal.js";

let guiManager;
let traceSelectPanel;
let juiceboxPanel;
let colorRampPanel;
let thumbnailPanel;
let distanceMapPanel;
let igvPanel;
let trackLoadController;

let structureFileLoadModal;
let juiceboxFileLoadModal;

const highlightColor = appleCrayonColorThreeJS('honeydew');

const createGUI = async container => {

    guiManager = new GUIManager({ $button: $('#spacewalk_ui_manager_button'), $panel: $('#spacewalk_ui_manager_panel') });

    traceSelectPanel = new TraceSelectPanel({ container, panel: $('#spacewalk_trace_select_panel').get(0), isHidden: guiManager.isPanelHidden('spacewalk_trace_select_panel') });

    colorRampPanel = new ColorRampPanel( colorRampPanelConfigurator({ container, highlightColor }) );

    thumbnailPanel = new ThumbnailPanel(thumbnailPanelConfigurator(container));

    distanceMapPanel = new DistanceMapPanel(distanceMapPanelConfigurator(container));

    //
    igvPanel = new IGVPanel({ container, panel: $('#spacewalk_igv_panel').get(0), isHidden: guiManager.isPanelHidden('spacewalk_igv_panel') });
    await igvPanel.initialize(igvBrowserConfigurator());

    //
    trackLoadController = new TrackLoadController(trackLoadControllerConfigurator({ browser: igvPanel.browser, trackRegistryFile, $googleDriveButton: undefined } ));
    await trackLoadController.updateTrackMenus(igvPanel.browser.genome.id);

    //
    juiceboxPanel = new JuiceboxPanel({ container, panel: $('#spacewalk_juicebox_panel').get(0), isHidden: guiManager.isPanelHidden('spacewalk_juicebox_panel') });
    await juiceboxPanel.initialize({container: $('#spacewalk_juicebox_root_container'), width: 400, height: 400});

    structureFileLoadModal = new DataFileLoadModal(structureFileLoadModalConfigurator());

    juiceboxFileLoadModal = new DataFileLoadModal(juiceboxFileLoadModalConfigurator());

};

export { createGUI, trackLoadController, guiManager, traceSelectPanel, juiceboxPanel, colorRampPanel, thumbnailPanel, distanceMapPanel, igvPanel, highlightColor };
