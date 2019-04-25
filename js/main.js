import { globalEventBus } from './eventBus.js';
import GUIManager from './guiManager.js';
import SceneManager from './sceneManager.js';
import DataFileLoadModal from './dataFileLoadModal.js';
import StructureSelectPanel from './structureSelectPanel.js';
import StructureManager from './structureManager.js';

// IGV
import IGVPanel from './igv/IGVPanel.js';
import { IGVMouseHandler } from './igv/IGVPanel.js';
import * as IGVConfigurator from './igv/igvConfigurator.js';

import TrackLoadController from './igv/trackLoadController.js';
import { trackLoadControllerConfigurator } from './igv/trackLoadController.js';


// Juicebox
import JuiceboxPanel from './juicebox/juiceboxPanel.js';
import { juiceboxMouseHandler } from './juicebox/juiceboxPanel.js'

import BallAndStick from './ballAndStick.js';
import Noodle from './noodle.js';

import { sceneManagerConfigurator } from './sceneManager.js';

let structureFileLoadModal;
let juiceboxFileLoadModal;

let guiManager;

let structureSelectPanel;
let igvPanel;
let juiceboxPanel;

let sceneManager;
let structureManager;

let doUpdateCameraPose = true;

let noodle;
let ballAndStick;

let trackLoadController;

let googleEnabled = false;

let main = async container => {

    guiManager = new GUIManager({ $button: $('#trace3d_ui_manager_button'), $panel: $('#trace3d_ui_manager_panel') });

    structureSelectPanel = new StructureSelectPanel({ container, panel: $('#trace3d_structure_select_panel').get(0), isHidden: guiManager.isPanelHidden('trace3d_structure_select_panel') });

    juiceboxPanel = new JuiceboxPanel({ container, panel: $('#trace3d_juicebox_panel').get(0), isHidden: guiManager.isPanelHidden('trace3d_juicebox_panel') });

    const juiceboxBrowserConfig =
        {
            container: $('#trace3d_juicebox_root_container'),
            // figureMode: true,
            width: 400,
            height: 400
        };

    let juiceboxBrowser = await juiceboxPanel.createBrowser(juiceboxBrowserConfig);
    juiceboxPanel.defaultConfiguration();

    if (juiceboxBrowser) {
        juiceboxPanel.defaultConfiguration();
    }

    igvPanel = new IGVPanel({ container, panel: $('#trace3d_igv_panel').get(0), isHidden: guiManager.isPanelHidden('trace3d_igv_panel') });

    const igvBrowserConfig = IGVConfigurator.browser;
    let igvBrowser = await igvPanel.createBrowser(igvBrowserConfig);

    const trackLoadControllerConfig = trackLoadControllerConfigurator(igvBrowser, IGVConfigurator.trackRegistryFile, googleEnabled, $('#igv-app-multiple-file-load-modal'));
    trackLoadController = new TrackLoadController(trackLoadControllerConfig);

    const sceneManagerConfig = sceneManagerConfigurator(container);
    sceneManager = new SceneManager(sceneManagerConfig);
    sceneManager.defaultConfiguration();

    structureManager = new StructureManager();

    const structureFileLoadModalConfig =
        {
            $urlModal: $('#trace3d-file-load-url-modal'),
            $selectModal: $('#trace3d-file-load-select-modal'),
            $localFileInput: $('#trace3d-file-load-local-input') ,
            selectLoader: ($select) => { },
            urlLoader: structureManager,
            localFileLoader: structureManager
        };

    structureFileLoadModal = new DataFileLoadModal(structureFileLoadModalConfig);

    const juiceboxFileLoadModalConfig =
        {
            $urlModal: $('#hic-load-url-modal'),
            $selectModal: $('#hic-contact-map-select-modal'),
            $localFileInput: $('#trace3d-juicebox-load-local-input'),
            selectLoader: async ($select) => {

                const data = await igv.xhr.loadString('resources/hicFiles.txt');
                const lines = igv.splitLines(data);

                for (let line of lines) {

                    const tokens = line.split('\t');

                    if (tokens.length > 1) {
                        const $option = $('<option value="' + tokens[0] + '">' + tokens[1] + '</option>');
                        $select.append($option);
                    }

                }

            },
            urlLoader: juiceboxPanel,
            localFileLoader: juiceboxPanel
        };

    juiceboxFileLoadModal = new DataFileLoadModal(juiceboxFileLoadModalConfig);

    noodle = new Noodle();

    ballAndStick = new BallAndStick();

    renderLoop();

    const eventListener =
        {
            receiveEvent: async ({ type, data }) => {
                let structure;

                if ('DidSelectStructure' === type) {

                    structure = structureManager.structureWithName(data);

                    igvBrowser.setCustomCursorGuideMouseHandler(({ bp, start, end, interpolant }) => {
                        IGVMouseHandler({bp, start, end, interpolant, structureLength: structure.array.length})
                    });

                    juiceboxBrowser.setCustomCrosshairsHandler(({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY }) => {
                        juiceboxMouseHandler({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY, structureLength: structure.array.length });
                    });

                    sceneManager.dispose();

                    structureManager.parsePathEncodedGenomicLocation(structureManager.path);

                    const { chr, genomicStart, genomicEnd } = structureManager.locus;
                    setup({ chr, genomicStart, genomicEnd, structure });

                } else if ('DidLoadFile' === type) {

                    let { name, payload } = data;

                    $('.navbar').find('#trace3d-file-name').text(name);

                    structureManager.path = name;
                    structureManager.ingest(payload);

                    structureManager.parsePathEncodedGenomicLocation(structureManager.path);

                    const { chr, genomicStart, genomicEnd } = structureManager.locus;

                    igvPanel.goto({ chr, start: genomicStart, end: genomicEnd });

                    juiceboxPanel.goto({ chr, start: genomicStart, end: genomicEnd });

                    const initialStructureKey = '0';

                    structure = structureManager.structureWithName(initialStructureKey);

                    igvBrowser.setCustomCursorGuideMouseHandler(({ bp, start, end, interpolant }) => {
                        IGVMouseHandler({bp, start, end, interpolant, structureLength: structure.array.length})
                    });

                    juiceboxBrowser.setCustomCrosshairsHandler(({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY }) => {
                        juiceboxMouseHandler({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY, structureLength: structure.array.length });
                    });

                    structureSelectPanel.configure({ structures: structureManager.structures, initialStructureKey });

                    sceneManager.dispose();

                    setup({ chr, genomicStart, genomicEnd, structure });

                    doUpdateCameraPose = false;

                } else if ('ToggleAllUIControls' === type) {
                    // $('.navbar').toggle();
                }

            }
        };

    globalEventBus.subscribe('DidSelectStructure', eventListener);
    globalEventBus.subscribe('DidLoadFile', eventListener);
    globalEventBus.subscribe('ToggleAllUIControls', eventListener);
};

let setup = ({ chr, genomicStart, genomicEnd, structure }) => {

    let [ structureLength, structureExtent, cameraPosition, structureCentroid ] = [ structure.array.length, structure.extent, structure.cameraPosition, structure.centroid ];

    sceneManager.configure({ chr, genomicStart, genomicEnd, structureLength, structureExtent, cameraPosition, structureCentroid, doUpdateCameraPose });

    noodle.configure(structure.array, sceneManager.colorRampPanel.colorRampWidget);
    noodle.addToScene(sceneManager.scene);
    // noodle.hide();

    ballAndStick.configure(structure.array);
    ballAndStick.addToScene(sceneManager.scene);
    ballAndStick.hide();

};

let renderLoop = () => {

    requestAnimationFrame( renderLoop );

    if (sceneManager.scene && sceneManager.orbitalCamera) {
        noodle.renderLoopHelper();
        ballAndStick.renderLoopHelper();
        sceneManager.renderer.render(sceneManager.scene, sceneManager.orbitalCamera.camera);
    }

};

export { trackLoadController, main, sceneManager, structureManager, guiManager };
