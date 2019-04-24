import { globalEventBus } from './eventBus.js';
import GUIManager from './guiManager.js';
import SceneManager from './sceneManager.js';
import DataFileLoadModal from './dataFileLoadModal.js';
import StructureSelectPanel from './structureSelectPanel.js';
import StructureManager from './structureManager.js';
import IGVPanel from './IGVPanel.js';
import JuiceboxPanel from './juiceboxPanel.js';
import BallAndStick from './ballAndStick.js';
import Noodle from './Noodle.js';

import { juiceboxMouseHandler } from './juiceboxPanel.js'
import { IGVMouseHandler, igvConfigurator } from './IGVPanel.js';
import { sceneManagerConfigurator } from './sceneManager.js';

let dataFileLoadeModal;

let guiManager;

let structureSelectPanel;
let igvPanel;
let juiceboxPanel;

let sceneManager;
let structureManager;

let doUpdateCameraPose = true;

let noodle;
let ballAndStick;

let main = async container => {

    guiManager = new GUIManager({ $button: $('#trace3d_ui_manager_button'), $panel: $('#trace3d_ui_manager_panel') });

    dataFileLoadeModal = new DataFileLoadModal({ $urlModal: $('#trace3d-file-load-url-modal'), $selectModal: $('#trace3d-file-load-select-modal')});

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

    const igvBrowserConfig = igvConfigurator();
    let igvBrowser = await igvPanel.createBrowser(igvBrowserConfig);

    const sceneManagerConfig = sceneManagerConfigurator(container);
    sceneManager = new SceneManager(sceneManagerConfig);
    sceneManager.defaultConfiguration();

    structureManager = new StructureManager();

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

export { main, sceneManager, structureManager, guiManager };
