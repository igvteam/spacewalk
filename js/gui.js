import {appleCrayonColorThreeJS} from "./color.js";
import GUIManager from "./guiManager.js";
import StructureSelectPanel from "./structureSelectPanel.js";
import JuiceboxPanel from "./juicebox/juiceboxPanel.js";
import ColorRampPanel, {colorRampPanelConfigurator} from "./colorRampPanel.js";
import ThumbnailPanel, {thumbnailPanelConfigurator} from "./thumbnailPanel.js";
import IGVPanel from "./igv/IGVPanel.js";
import {igvBrowserConfigurator, trackRegistryFile} from "./igv/igvConfigurator.js";
import {customIGVTrackHandler} from "./igv/IGVPanel.js";
import TrackLoadController, { trackLoadControllerConfigurator } from "./igv/trackLoadController.js";
import DataFileLoadModal, { juiceboxFileLoadModalConfigurator, structureFileLoadModalConfigurator } from "./dataFileLoadModal.js";

let guiManager;
let structureSelectPanel;
let juiceboxPanel;
let colorRampPanel;
let thumbnailPanel;
let igvPanel;
let trackLoadController;

let structureFileLoadModal;
let juiceboxFileLoadModal;

const highlightColor = appleCrayonColorThreeJS('honeydew');

const createGUI = async container => {

    guiManager = new GUIManager({ $button: $('#trace3d_ui_manager_button'), $panel: $('#trace3d_ui_manager_panel') });
    structureSelectPanel = new StructureSelectPanel({ container, panel: $('#trace3d_structure_select_panel').get(0), isHidden: guiManager.isPanelHidden('trace3d_structure_select_panel') });
    colorRampPanel = new ColorRampPanel( colorRampPanelConfigurator({ container, highlightColor }) );
    thumbnailPanel = new ThumbnailPanel(thumbnailPanelConfigurator(container));

    //
    igvPanel = new IGVPanel({ container, panel: $('#trace3d_igv_panel').get(0), isHidden: guiManager.isPanelHidden('trace3d_igv_panel') });
    await igvPanel.initialize(igvBrowserConfigurator(customIGVTrackHandler));

    //
    trackLoadController = new TrackLoadController(trackLoadControllerConfigurator({ browser: igvPanel.browser, trackRegistryFile, $googleDriveButton: undefined } ));
    await trackLoadController.updateTrackMenus(igvPanel.browser.genome.id);

    //
    // juiceboxPanel = new JuiceboxPanel({ container, panel: $('#trace3d_juicebox_panel').get(0), isHidden: guiManager.isPanelHidden('trace3d_juicebox_panel') });
    // await juiceboxPanel.initialize({ container: $('#trace3d_juicebox_root_container'), width: 400, height: 400});
    // await juiceboxPanel.defaultConfiguration();

    structureFileLoadModal = new DataFileLoadModal(structureFileLoadModalConfigurator());

    // juiceboxFileLoadModal = new DataFileLoadModal(juiceboxFileLoadModalConfigurator());

};

export { createGUI, trackLoadController, guiManager, structureSelectPanel, juiceboxPanel, colorRampPanel, thumbnailPanel, igvPanel, highlightColor };
