import EventBus from "./eventBus.js";
import GSDB from "./gsdb/gsdb.js";
import EnsembleManager from "./ensembleManager.js";
import ColorMapManager from "./colorMapManager.js";
import Parser from "./parser.js";
import SceneManager, {sceneManagerConfigurator} from "./sceneManager.js";
import DataValueMaterialProvider from "./dataValueMaterialProvider.js";
import ColorRampMaterialProvider from "./colorRampMaterialProvider.js";
import PointCloud from "./pointCloud.js";
import Noodle from "./noodle.js";
import BallAndStick from "./ballAndStick.js";
import GUIManager from "./guiManager.js";
import TraceSelectPanel from "./traceSelectPanel.js";
import ColorRampPanel, {colorRampPanelConfigurator} from "./colorRampPanel.js";
import DistanceMapPanel, {distanceMapPanelConfigurator} from "./distanceMapPanel.js";
import ContactFrequencyMapPanel, {contactFrequencyMapPanelConfigurator} from "./contactFrequencyMapPanel.js";
import IGVPanel, {igvBrowserConfigurator} from "./igv/IGVPanel.js";
import JuiceboxPanel from "./juicebox/juiceboxPanel.js";
import DataFileLoadModal, { juiceboxFileLoadModalConfigurator, spaceWalkFileLoadModalConfigurator } from "./dataFileLoadModal.js";
import { appleCrayonColorRGB255, appleCrayonColorThreeJS, highlightColor } from "./color.js";

let gsdb;

let eventBus = new EventBus();

let pointCloud;
let noodle;
let ballAndStick;
let ensembleManager;
let colorMapManager;
let parser;
let sceneManager;
let dataValueMaterialProvider;
let colorRampMaterialProvider;
let appWindowWidth;
let appWindowHeight;
let guiManager;

let traceSelectPanel;
let colorRampPanel;
let spaceWalkFileLoadModal;
let juiceboxFileLoadModal;

let igvPanel;
let juiceboxPanel;
let distanceMapPanel;
let contactFrequencyMapPanel;

document.addEventListener("DOMContentLoaded", event => {

    parser = new Parser();

    pointCloud = new PointCloud();

    noodle = new Noodle();

    ballAndStick = new BallAndStick();

    ensembleManager = new EnsembleManager();

    gsdb = new GSDB(parser);

    colorMapManager = new ColorMapManager();
    colorMapManager.configure();

    dataValueMaterialProvider = new DataValueMaterialProvider({ width: 2048, height: 64, colorMinimum: appleCrayonColorRGB255('silver'), colorMaximum: appleCrayonColorRGB255('blueberry'), highlightColor:appleCrayonColorThreeJS('maraschino')  });

    const $canvasContainer = $('#spacewalk_color_ramp_canvas_container');
    colorRampMaterialProvider = new ColorRampMaterialProvider( { $canvasContainer, highlightColor } );

    guiManager = new GUIManager({ $button: $('#spacewalk_ui_manager_button'), $panel: $('#spacewalk_ui_manager_panel') });

    const container = document.getElementById('spacewalk_canvas_container');
    sceneManager = new SceneManager(sceneManagerConfigurator({ container, highlightColor, renderStyle: guiManager.getRenderStyle() }));

    createPanelsAndModals(container);

    renderLoop();

});

let renderLoop = () => {
    requestAnimationFrame( renderLoop );
    sceneManager.render();
};

const createPanelsAndModals = container => {

    traceSelectPanel = new TraceSelectPanel({ container, panel: $('#spacewalk_trace_select_panel').get(0), isHidden: guiManager.isPanelHidden('spacewalk_trace_select_panel') });

    colorRampPanel = new ColorRampPanel( colorRampPanelConfigurator({ container, isHidden: guiManager.isPanelHidden('spacewalk_color_ramp_panel') }) );

    distanceMapPanel = new DistanceMapPanel(distanceMapPanelConfigurator({ container, isHidden: guiManager.isPanelHidden('spacewalk_distance_map_panel') }));

    contactFrequencyMapPanel = new ContactFrequencyMapPanel(contactFrequencyMapPanelConfigurator({ container, isHidden: guiManager.isPanelHidden('spacewalk_contact_frequency_map_panel') }));

    igvPanel = new IGVPanel({ container, panel: $('#spacewalk_igv_panel').get(0), isHidden: guiManager.isPanelHidden('spacewalk_igv_panel') });
    igvPanel.materialProvider = colorRampMaterialProvider;
    igvPanel.initialize(igvBrowserConfigurator());

    juiceboxPanel = new JuiceboxPanel({ container, panel: $('#spacewalk_juicebox_panel').get(0), isHidden: guiManager.isPanelHidden('spacewalk_juicebox_panel') });
    juiceboxPanel.initialize({container: $('#spacewalk_juicebox_root_container'), width: 400, height: 400});

    spaceWalkFileLoadModal = new DataFileLoadModal(spaceWalkFileLoadModalConfigurator( { fileLoader: parser } ));

    juiceboxFileLoadModal = new DataFileLoadModal(juiceboxFileLoadModalConfigurator( { fileLoader: juiceboxPanel } ));

    $(window).on('resize.app', () => {
        let { width, height } = container.getBoundingClientRect();
        appWindowWidth = width;
        appWindowHeight = height;

        eventBus.post({ type: "AppWindowDidResize", data: { width, height } });
    });

};

const showSpinner = () => {
    document.getElementById('spacewalk-spinner').style.display = 'block';
    console.log('show spinner');
};

const hideSpinner = () => {
    document.getElementById('spacewalk-spinner').style.display = 'none';
    console.log('hide spinner');
};

export { appWindowWidth, appWindowHeight, eventBus, pointCloud, noodle, ballAndStick, ensembleManager, colorMapManager, sceneManager, colorRampMaterialProvider, dataValueMaterialProvider, guiManager, showSpinner, hideSpinner, juiceboxPanel, distanceMapPanel, contactFrequencyMapPanel, igvPanel };
