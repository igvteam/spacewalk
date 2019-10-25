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
import { tinyURLService, loadSession, getSessionURL } from "./session.js";

let eventBus = new EventBus();

let pointCloud;
let noodle;
let ballAndStick;
let parser;
let ensembleManager;
let colorMapManager;
let sceneManager;
let dataValueMaterialProvider;
let colorRampMaterialProvider;
let guiManager;

let gsdb;
let traceSelectPanel;
let colorRampPanel;
let spaceWalkFileLoadModal;
let juiceboxFileLoadModal;

let igvPanel;
let juiceboxPanel;
let distanceMapPanel;
let contactFrequencyMapPanel;

document.addEventListener("DOMContentLoaded", async (event) => {

    parser = new Parser();

    pointCloud = new PointCloud();

    noodle = new Noodle();

    ballAndStick = new BallAndStick();

    ensembleManager = new EnsembleManager();

    gsdb = new GSDB(parser);

    colorMapManager = new ColorMapManager();
    await colorMapManager.configure();

    dataValueMaterialProvider = new DataValueMaterialProvider({ width: 2048, height: 64, colorMinimum: appleCrayonColorRGB255('silver'), colorMaximum: appleCrayonColorRGB255('blueberry'), highlightColor:appleCrayonColorThreeJS('maraschino')  });

    const $canvasContainer = $('#spacewalk_color_ramp_canvas_container');
    colorRampMaterialProvider = new ColorRampMaterialProvider( { $canvasContainer, highlightColor } );

    guiManager = new GUIManager({ $button: $('#spacewalk_ui_manager_button'), $panel: $('#spacewalk_ui_manager_panel') });

    const container = document.getElementById('spacewalk_canvas_container');
    sceneManager = new SceneManager(sceneManagerConfigurator({ container, highlightColor, renderStyle: guiManager.getRenderStyle() }));

    await createPanelsAndModals(container);

    renderLoop();

    await loadSession(window.location.href);

});

const renderLoop = () => {

    requestAnimationFrame( renderLoop );

    if (sceneManager.isGoodToGo()) {

        pointCloud.renderLoopHelper();

        noodle.renderLoopHelper();

        ballAndStick.renderLoopHelper();

        dataValueMaterialProvider.renderLoopHelper();

        colorRampMaterialProvider.renderLoopHelper();

        sceneManager.renderLoopHelper();

    }

};

const createPanelsAndModals = async (container) => {

    $('#spacewalk-copy-link').on('click', e => {

        $('#spacewalk-share-url')[0].select();

        const success = document.execCommand('copy');
        if (success) {
            $('#spacewalk-share-url-modal').modal('hide');
        } else {
            alert("Copy not successful");
        }
    });

    $('#spacewalk-share-url-modal').on('show.bs.modal', async (e) => {

        const url = getSessionURL();

        let response;

        const path = `${ tinyURLService }${ url }`;
        try {
            response = await fetch(path);
        } catch (error) {
            console.warn(error.message);
            return;
        }

        if (200 !== response.status) {
            console.log('ERROR: bad response status');
        }

        let tinyURL = undefined;
        try {
            tinyURL = await response.text();
        } catch (e) {
            console.warn(e.message);
        }

        if (tinyURL) {
            console.log(`session: ${ tinyURL }`);

            const $spacewalk_share_url = $('#spacewalk-share-url');
            $spacewalk_share_url.val( tinyURL );
            $spacewalk_share_url.get(0).select();

        }

        return false;

    });

    traceSelectPanel = new TraceSelectPanel({ container, panel: $('#spacewalk_trace_select_panel').get(0), isHidden: guiManager.isPanelHidden('spacewalk_trace_select_panel') });

    colorRampPanel = new ColorRampPanel( colorRampPanelConfigurator({ container, isHidden: guiManager.isPanelHidden('spacewalk_color_ramp_panel') }) );

    distanceMapPanel = new DistanceMapPanel(distanceMapPanelConfigurator({ container, isHidden: guiManager.isPanelHidden('spacewalk_distance_map_panel') }));

    contactFrequencyMapPanel = new ContactFrequencyMapPanel(contactFrequencyMapPanelConfigurator({ container, isHidden: guiManager.isPanelHidden('spacewalk_contact_frequency_map_panel') }));

    juiceboxPanel = new JuiceboxPanel({ container, panel: $('#spacewalk_juicebox_panel').get(0), isHidden: guiManager.isPanelHidden('spacewalk_juicebox_panel') });
    await juiceboxPanel.initialize({container: $('#spacewalk_juicebox_root_container'), width: 400, height: 400});

    igvPanel = new IGVPanel({ container, panel: $('#spacewalk_igv_panel').get(0), isHidden: guiManager.isPanelHidden('spacewalk_igv_panel') });
    igvPanel.materialProvider = colorRampMaterialProvider;
    await igvPanel.initialize(igvBrowserConfigurator());

    spaceWalkFileLoadModal = new DataFileLoadModal(spaceWalkFileLoadModalConfigurator( { fileLoader: parser } ));

    juiceboxFileLoadModal = new DataFileLoadModal(juiceboxFileLoadModalConfigurator( { fileLoader: juiceboxPanel } ));

    $(window).on('resize.app', () => {
        let { width, height } = container.getBoundingClientRect();
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

export { eventBus, pointCloud, noodle, ballAndStick, parser, ensembleManager, colorMapManager, sceneManager, colorRampMaterialProvider, dataValueMaterialProvider, guiManager, showSpinner, hideSpinner, juiceboxPanel, distanceMapPanel, contactFrequencyMapPanel, igvPanel };
