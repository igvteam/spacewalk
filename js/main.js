import * as THREE from "./threejs_es6/three.module.js";
import { globalEventBus } from './eventBus.js';
import GUIManager from './guiManager.js';
import SceneManager from './sceneManager.js';
import StructureManager from './structureManager.js';

// Data File Load Modal
import DataFileLoadModal from './dataFileLoadModal.js';
import { structureFileLoadModalConfigurator, juiceboxFileLoadModalConfigurator } from './dataFileLoadModal.js';

// IGV Panel
import IGVPanel from './igv/IGVPanel.js';
import * as IGVConfigurator from './igv/igvConfigurator.js';

// Track Load Controller
import TrackLoadController from './igv/trackLoadController.js';
import { trackLoadControllerConfigurator } from './igv/trackLoadController.js';

// Juicebox Panel
import JuiceboxPanel from './juicebox/juiceboxPanel.js';

// Structure Select Panel
import StructureSelectPanel from './structureSelectPanel.js';

// Thumbnail Panel
import ThumbnailPanel from './thumbnailPanel.js';
import { thumbnailPanelConfigurator } from './thumbnailPanel.js';

import BallAndStick from './ballAndStick.js';
import Noodle from './noodle.js';

import { sceneManagerConfigurator } from './sceneManager.js';

import { mainEventListener } from './mainEventListener.js';

let structureFileLoadModal;
let juiceboxFileLoadModal;

let guiManager;

let structureSelectPanel;
let igvPanel;
let juiceboxPanel;
let thumbnailPanel;

let sceneManager;
let structureManager;

let noodle;
let ballAndStick;

let trackLoadController;

let igvBrowser;
let juiceboxBrowser;

let main = async container => {

    guiManager = new GUIManager({ $button: $('#trace3d_ui_manager_button'), $panel: $('#trace3d_ui_manager_panel') });

    structureSelectPanel = new StructureSelectPanel({ container, panel: $('#trace3d_structure_select_panel').get(0), isHidden: guiManager.isPanelHidden('trace3d_structure_select_panel') });

    juiceboxPanel = new JuiceboxPanel({ container, panel: $('#trace3d_juicebox_panel').get(0), isHidden: guiManager.isPanelHidden('trace3d_juicebox_panel') });

    thumbnailPanel = new ThumbnailPanel(thumbnailPanelConfigurator(container));

    igvPanel = new IGVPanel({ container, panel: $('#trace3d_igv_panel').get(0), isHidden: guiManager.isPanelHidden('trace3d_igv_panel') });

    juiceboxBrowser = await juiceboxPanel.createBrowser({ container: $('#trace3d_juicebox_root_container'), width: 400, height: 400 });
    juiceboxPanel.defaultConfiguration();

    igvBrowser = await igvPanel.createBrowser(IGVConfigurator.browser);

    trackLoadController = new TrackLoadController(trackLoadControllerConfigurator({ browser: igvBrowser, trackRegistryFile: IGVConfigurator.trackRegistryFile, $googleDriveButton: undefined } ));

    sceneManager = new SceneManager(sceneManagerConfigurator(container));
    sceneManager.defaultConfiguration();

    structureManager = new StructureManager();

    structureFileLoadModal = new DataFileLoadModal(structureFileLoadModalConfigurator());

    juiceboxFileLoadModal = new DataFileLoadModal(juiceboxFileLoadModalConfigurator());

    noodle = new Noodle();

    ballAndStick = new BallAndStick();

    renderLoop();

    globalEventBus.subscribe('DidSelectStructure', mainEventListener);
    globalEventBus.subscribe('DidLoadFile', mainEventListener);
    globalEventBus.subscribe('ToggleAllUIControls', mainEventListener);
    globalEventBus.subscribe('RenderStyleDidChange', mainEventListener);

};

let setup = ({ genomicStart, genomicEnd, structure }) => {

    sceneManager.colorRampPanel.configure({genomicStart, genomicEnd, structureLength: structure.length });

    noodle.configure(structure, sceneManager.colorRampPanel.colorRampWidget, sceneManager.renderStyle);
    ballAndStick.configure(structure, sceneManager.renderStyle);

    let scene = new THREE.Scene();

    noodle.addToScene(scene);
    ballAndStick.addToScene(scene);

    const { center, radius } = ballAndStick.getBounds();
    const { position, fov } = ballAndStick.getCameraPoseAlongAxis({ axis: '+z', scaleFactor: 3 });

    sceneManager.configure({scene, structureExtent: (2 * radius), cameraPosition: position, structureCentroid: center, fov});

    if (false === thumbnailPanel.isHidden) {
        const model = sceneManager.renderStyle === Noodle.getRenderStyle() ? noodle : ballAndStick;
        thumbnailPanel.configure(model);
        thumbnailPanel.render();
    }

};

let renderLoop = () => {

    requestAnimationFrame( renderLoop );

    if (sceneManager.scene && sceneManager.orbitalCamera) {
        noodle.renderLoopHelper();
        ballAndStick.renderLoopHelper();
        sceneManager.renderer.render(sceneManager.scene, sceneManager.orbitalCamera.camera);
    }

};

export { main, setup, thumbnailPanel, noodle, ballAndStick, structureSelectPanel, igvBrowser, igvPanel, juiceboxBrowser, juiceboxPanel, trackLoadController, sceneManager, structureManager, guiManager };
