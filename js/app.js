import { Alert, createGenericSelectModal, createTrackURLModal } from '../node_modules/igv-ui/src/index.js'
import EventBus from "./eventBus.js";
import GSDB from "./gsdb/gsdb.js";
import EnsembleManager from "./ensembleManager.js";
import ColorMapManager from "./colorMapManager.js";
import Parser from "./parser.js";
import SceneManager, {sceneManagerConfigurator} from "./sceneManager.js";
import DataValueMaterialProvider from "./dataValueMaterialProvider.js";
import ColorRampMaterialProvider from "./colorRampMaterialProvider.js";
import Panel from "./panel.js";
import PointCloud from "./pointCloud.js";
import Noodle from "./noodle.js";
import BallAndStick from "./ballAndStick.js";
import GUIManager, { doConfigurePanelHidden } from "./guiManager.js";
import TraceSelectPanel from "./traceSelectPanel.js";
import ColorRampPanel, {colorRampPanelConfigurator} from "./colorRampPanel.js";
import DistanceMapPanel, {distanceMapPanelConfigurator} from "./distanceMapPanel.js";
import ContactFrequencyMapPanel, {contactFrequencyMapPanelConfigurator} from "./contactFrequencyMapPanel.js";
import IGVPanel, {igvBrowserConfigurator} from "./igv/IGVPanel.js";
import JuiceboxPanel from "./juicebox/juiceboxPanel.js";
import DataFileLoadModal, { juiceboxFileLoadModalConfigurator, spaceWalkFileLoadModalConfigurator } from "./dataFileLoadModal.js";
import { appleCrayonColorRGB255, appleCrayonColorThreeJS, highlightColor } from "./color.js";
import { saveSession, loadSession } from "./session.js";

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
let spaceWalkFileLoadModal;
let juiceboxFileLoadModal;

let traceSelectPanel;
let colorRampPanel;
let distanceMapPanel;
let contactFrequencyMapPanel;
let juiceboxPanel;
let igvPanel;

document.addEventListener("DOMContentLoaded", async (event) => {

    const container = document.getElementById('spacewalk_canvas_container');

    Alert.init(container);

    const root = document.querySelector('#spacewalk-main');
    $(root).append(createGenericSelectModal('spacewalk-igv-app-generic-track-select-modal', 'spacewalk-igv-app-generic-track-select'));
    $(root).append(createTrackURLModal('spacewalk-igv-app-track-from-url-modal'));
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

    sceneManager = new SceneManager(sceneManagerConfigurator({ container, highlightColor }));

    await createButtonsPanelsModals(container);

    guiManager = new GUIManager({ $button: $('#spacewalk_ui_manager_button'), $panel: $('#spacewalk_ui_manager_panel') });

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

const createButtonsPanelsModals = async container => {

    $('#spacewalk-reset-camera-button').on('click.spacewalk-reset-camera-button', e => {
        sceneManager.resetCamera();
    });

    const $share_url_modal = $('#spacewalk-share-url-modal');
    const $spacewalk_share_url = $('#spacewalk-share-url');

    $('#spacewalk-share-button').on('click.spacewalk-share-button', async e => {

        const url = await saveSession();

        if (url) {

            console.log(`session: ${ url }`);

            $spacewalk_share_url.val( url );
            $spacewalk_share_url.get(0).select();

            $share_url_modal.modal('show');
        }

    });

    $('#spacewalk-copy-link').on('click.spacewalk-copy-link', e => {

        $spacewalk_share_url.get(0).select();

        const success = document.execCommand('copy');
        if (success) {
            $share_url_modal.modal('hide');
        } else {
            alert("Copy not successful");
        }
    });

    traceSelectPanel = new TraceSelectPanel({ container, panel: $('#spacewalk_trace_select_panel').get(0), isHidden: doConfigurePanelHidden('spacewalk_trace_select_panel') });

    colorRampPanel = new ColorRampPanel( colorRampPanelConfigurator({ container, isHidden: doConfigurePanelHidden('spacewalk_color_ramp_panel') }) );

    distanceMapPanel = new DistanceMapPanel(distanceMapPanelConfigurator({ container, isHidden: doConfigurePanelHidden('spacewalk_distance_map_panel') }));

    contactFrequencyMapPanel = new ContactFrequencyMapPanel(contactFrequencyMapPanelConfigurator({ container, isHidden: doConfigurePanelHidden('spacewalk_contact_frequency_map_panel') }));

    juiceboxPanel = new JuiceboxPanel({ container, panel: $('#spacewalk_juicebox_panel').get(0), isHidden: doConfigurePanelHidden('spacewalk_juicebox_panel') });
    await juiceboxPanel.initialize({container: $('#spacewalk_juicebox_root_container'), width: 400, height: 400});

    igvPanel = new IGVPanel({ container, panel: $('#spacewalk_igv_panel').get(0), isHidden: doConfigurePanelHidden('spacewalk_igv_panel') });
    igvPanel.materialProvider = colorRampMaterialProvider;
    await igvPanel.initialize(igvBrowserConfigurator());

    Panel.setPanelList([traceSelectPanel, colorRampPanel, distanceMapPanel, contactFrequencyMapPanel, juiceboxPanel, igvPanel]);

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

export { eventBus, pointCloud, noodle, ballAndStick, parser, ensembleManager, colorMapManager, sceneManager, colorRampMaterialProvider, dataValueMaterialProvider, guiManager, showSpinner, hideSpinner, juiceboxPanel, distanceMapPanel, contactFrequencyMapPanel, igvPanel, traceSelectPanel, colorRampPanel };
