import { AlertSingleton, EventBus } from '../node_modules/igv-widgets/dist/igv-widgets.js'
import {GoogleAuth} from '../node_modules/igv-utils/src/index.js'
import EnsembleManager from "./ensembleManager.js";
import ColorMapManager from "./colorMapManager.js";
import Parser from "./parser.js";
import SceneManager, {sceneManagerConfigurator} from "./sceneManager.js";
import DataValueMaterialProvider from "./dataValueMaterialProvider.js";
import ColorRampMaterialProvider from "./colorRampMaterialProvider.js";
import Panel from "./panel.js";
import PointCloud from "./pointCloud.js";
import Ribbon from "./ribbon.js";
import Noodle from "./noodle.js";
import BallAndStick from "./ballAndStick.js";
import GUIManager, { doConfigurePanelHidden } from "./guiManager.js";
import TraceSelectPanel from "./traceSelectPanel.js";
import ColorRampPanel, {colorRampPanelConfigurator} from "./colorRampPanel.js";
import DistanceMapPanel, {distanceMapPanelConfigurator} from "./distanceMapPanel.js";
import ContactFrequencyMapPanel, {contactFrequencyMapPanelConfigurator} from "./contactFrequencyMapPanel.js";
import IGVPanel from "./igv/IGVPanel.js";
import JuiceboxPanel from "./juicebox/juiceboxPanel.js";
import { appleCrayonColorRGB255, appleCrayonColorThreeJS, highlightColor } from "./color.js";
import { getUrlParams, getShareURL, loadSession } from "./session.js";
import { initializeMaterialLibrary } from "./materialLibrary.js";
import RenderContainerController from "./renderContainerController.js";
import {createSpacewalkFileLoaders} from './spacewalkFileLoad.js'
import BallHighlighter from "./ballHighlighter.js";
import PointCloudHighlighter from "./pointCloudHighlighter.js";

let pointCloud;
let ribbon;
let noodle;
let ballAndStick;
let parser;
let ensembleManager;
let colorMapManager;
let sceneManager;
let dataValueMaterialProvider;
let colorRampMaterialProvider;
let guiManager;
let traceSelectPanel;
let colorRampPanel;
let distanceMapPanel;
let contactFrequencyMapPanel;
let juiceboxPanel;
let igvPanel;
let renderContainerController;
let googleEnabled = false;

document.addEventListener("DOMContentLoaded", async (event) => {

    const container = document.getElementById('spacewalk-root-container');

    AlertSingleton.init(container)

    const { userAgent } = window.navigator;

    const isChromeUserAgent = userAgent.indexOf("Chrome") > -1;

    try {

        if (!isChromeUserAgent) {
            throw new Error("Spacewalk only supports Chrome Browser");
        }

    } catch (e) {
        AlertSingleton.present(e.message)
    }

    const { clientId, apiKey } = spacewalkConfig
    const enableGoogle = clientId && 'CLIENT_ID' !== clientId && (window.location.protocol === "https:" || window.location.host === "localhost")

    if (enableGoogle) {
        try {
            await GoogleAuth.init({ clientId, apiKey, scope: 'https://www.googleapis.com/auth/userinfo.profile' })
            await GoogleAuth.signOut()
            googleEnabled = true
        } catch (e) {
            console.error(e)
            AlertSingleton.present(e.message)
        }
    }

    await initializationHelper(container)

});

const initializationHelper = async container => {

    await initializeMaterialLibrary();

    parser = new Parser();

    pointCloud = new PointCloud({ pickHighlighter: new PointCloudHighlighter(highlightColor), deemphasizedColor: appleCrayonColorThreeJS('magnesium') })

    ribbon = new Ribbon();
    // noodle = new Noodle();
    ballAndStick = new BallAndStick({ pickHighlighter: new BallHighlighter(highlightColor) });

    ensembleManager = new EnsembleManager();

    colorMapManager = new ColorMapManager();
    await colorMapManager.configure();

    dataValueMaterialProvider = new DataValueMaterialProvider({ width: 2048, height: 64, colorMinimum: appleCrayonColorRGB255('silver'), colorMaximum: appleCrayonColorRGB255('blueberry'), highlightColor:appleCrayonColorThreeJS('maraschino')  });

    const $canvasContainer = $('#spacewalk_color_ramp_canvas_container');
    colorRampMaterialProvider = new ColorRampMaterialProvider( { $canvasContainer, highlightColor } );

    sceneManager = new SceneManager(sceneManagerConfigurator({ container: document.getElementById('spacewalk-threejs-container'), highlightColor }));

    renderContainerController = new RenderContainerController(container, sceneManager);

    const { sessionURL:igvSessionURL, session:juiceboxSessionURL, spacewalkSessionURL } = getUrlParams(window.location.href);

    await createButtonsPanelsModals(container, igvSessionURL, juiceboxSessionURL);

    guiManager = new GUIManager({ $button: $('#spacewalk_ui_manager_button'), $panel: $('#spacewalk_ui_manager_panel') });

    renderLoop();

    await loadSession(spacewalkSessionURL)

}

const createButtonsPanelsModals = async (container, igvSessionURL, juiceboxSessionURL) => {

    const spacewalkFileLoadConfig =
        {
            rootContainer: document.getElementById('spacewalk-main'),
            $localFileInput: $('#spacewalk-sw-load-local-input'),
            urlLoadModalId: 'spacewalk-sw-load-url-modal',
            gsdbModalId: 'spacewalk-gsdb-modal',
            $selectModal: $('#spacewalk-sw-load-select-modal'),
            $dropboxButton: $('#spacewalk-sw-dropbox-button'),
            $googleDriveButton: $('#spacewalk-sw-google-drive-button'),
            googleEnabled,
            fileLoader: parser
        };

    createSpacewalkFileLoaders(spacewalkFileLoadConfig)

    // $('#spacewalk-reset-camera-button').on('click.spacewalk-reset-camera-button', e => {
    //     sceneManager.resetCamera();
    // });

    createShareWidgets($('#spacewalk-main'), $('#spacewalk-share-button'), 'spacewalk-share-modal')

    traceSelectPanel = new TraceSelectPanel({ container, panel: $('#spacewalk_trace_select_panel').get(0), isHidden: doConfigurePanelHidden('spacewalk_trace_select_panel') });

    colorRampPanel = new ColorRampPanel( colorRampPanelConfigurator({ container, isHidden: doConfigurePanelHidden('spacewalk_color_ramp_panel') }) );

    distanceMapPanel = new DistanceMapPanel(distanceMapPanelConfigurator({ container, isHidden: doConfigurePanelHidden('spacewalk_distance_map_panel') }));

    contactFrequencyMapPanel = new ContactFrequencyMapPanel(contactFrequencyMapPanelConfigurator({ container, isHidden: doConfigurePanelHidden('spacewalk_contact_frequency_map_panel') }));

    juiceboxPanel = new JuiceboxPanel({ container, panel: $('#spacewalk_juicebox_panel').get(0), isHidden: doConfigurePanelHidden('spacewalk_juicebox_panel') });

    if (juiceboxSessionURL) {
        await juiceboxPanel.initialize({ container: $('#spacewalk_juicebox_root_container').get(0), width: 480, height: 480, session: juiceboxSessionURL })
    } else {
        await juiceboxPanel.initialize({ container: $('#spacewalk_juicebox_root_container').get(0), width: 480, height: 480, session: undefined })
    }

    igvPanel = new IGVPanel({ container, panel: $('#spacewalk_igv_panel').get(0), isHidden: doConfigurePanelHidden('spacewalk_igv_panel') })
    igvPanel.materialProvider = colorRampMaterialProvider;

    if (igvSessionURL) {
        await igvPanel.initialize({ ...spacewalkConfig, ...({ session: igvSessionURL }) })
    } else {
        await igvPanel.initialize(spacewalkConfig);
    }

    Panel.setPanelList([traceSelectPanel, colorRampPanel, distanceMapPanel, contactFrequencyMapPanel, juiceboxPanel, igvPanel]);

    $(window).on('resize.app', e => {

        // Prevent responding to resize event sent by jQuery resizable()
        const status = $(e.target).hasClass('ui-resizable');

        if (false === status) {
            let { width, height } = container.getBoundingClientRect();
            EventBus.globalBus.post({ type: 'AppWindowDidResize', data: { width, height } });
        }
    });

};

const createShareWidgets = ($container, $share_button, share_modal_id) => {

    const modal =
        `<div id="${ share_modal_id }" class="modal fade">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">

                <div class="modal-header">
                    <div class="modal-title">Share</div>
                    <button type="button" class="close" data-dismiss="modal">
                        <span>&times;</span>
                    </button>
                </div>

                <div class="modal-body">
                    <div class="container-fluid">
                        <div class="row">
                            <div class="col-md-9">
                                <div class="form-group">
                                    <input type="text" class="form-control" placeholder="">
                                </div>
                            </div>
                            <div class="col-md-3">
                                <button type="button" class="btn btn-default">COPY</button>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    </div>`

    $container.append($(modal))
    const $share_modal = $(`#${ share_modal_id }`)

    const $share_input = $share_modal.find('input')

    $share_button.on('click.spacewalk-share-button', async e => {

        let url = undefined
        try {
            url = await getShareURL()
        } catch (e) {
            AlertSingleton.present(e.message)
            return
        }

        if (url) {
            $share_input.val( url )
            $share_input.get(0).select()
            $share_modal.modal('show')
        }

    })

    const $copy_button = $share_modal.find('button')

    $copy_button.on('click.spacewalk-copy', e => {

        $share_input.get(0).select()

        const success = document.execCommand('copy')
        if (success) {
            $share_modal.modal('hide')
        } else {
            alert("Copy not successful")
        }
    })

}

const appendAndConfigureLoadURLModal = (root, id, input_handler) => {

    const html =
        `<div id="${id}" class="modal fade">
            <div class="modal-dialog  modal-lg">
                <div class="modal-content">

                <div class="modal-header">
                    <div class="modal-title">Load URL</div>

                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>

                </div>

                <div class="modal-body">

                    <div class="form-group">
                        <input type="text" class="form-control" placeholder="Enter URL">
                    </div>

                </div>

                </div>
            </div>
        </div>`;

    $(root).append(html);

    const $modal = $(root).find(`#${ id }`);
    $modal.find('input').on('change', function () {

        const path = $(this).val();
        $(this).val("");

        $(`#${ id }`).modal('hide');

        input_handler(path);


    });

    return html;
}

const renderLoop = () => {

    requestAnimationFrame( renderLoop );

    if (sceneManager.isGoodToGo()) {

        pointCloud.renderLoopHelper();

        ribbon.renderLoopHelper();

        dataValueMaterialProvider.renderLoopHelper();

        colorRampMaterialProvider.renderLoopHelper();

        sceneManager.renderLoopHelper();

    }

};

const showSpinner = () => {
    document.getElementById('spacewalk-spinner').style.display = 'block';
    console.log('show spinner');
};

const hideSpinner = () => {
    document.getElementById('spacewalk-spinner').style.display = 'none';
    console.log('hide spinner');
};

export { googleEnabled, pointCloud, ribbon, noodle, ballAndStick, parser, ensembleManager, colorMapManager, sceneManager, colorRampMaterialProvider, dataValueMaterialProvider, guiManager, showSpinner, hideSpinner, juiceboxPanel, distanceMapPanel, contactFrequencyMapPanel, igvPanel, traceSelectPanel, colorRampPanel, appendAndConfigureLoadURLModal };
