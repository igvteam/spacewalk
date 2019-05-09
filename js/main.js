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
import { customIGVTrackHandler } from './igv/IGVPanel.js';
import { trackRegistryFile, igvBrowserConfigurator } from './igv/igvConfigurator.js';

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

import DataValueMaterialProvider from './dataValueMaterialProvider.js';

import { sceneManagerConfigurator } from './sceneManager.js';

import { mainEventListener } from './mainEventListener.js';
import ColorRampPanel, { colorRampPanelConfigurator } from "./colorRampPanel.js";
import { appleCrayonColorThreeJS, appleCrayonColorRGB255 } from "./color.js";

let structureFileLoadModal;
let juiceboxFileLoadModal;

let guiManager;

let structureSelectPanel;
let igvPanel;
let juiceboxPanel;
let thumbnailPanel;
let colorRampPanel;

let sceneManager;
let structureManager;

let noodle;
let ballAndStick;

let trackLoadController;

let igvBrowser;
let juiceboxBrowser;

let dataValueMaterialProvider;

let main = async container => {

    // const highlightColor = appleCrayonColorThreeJS('maraschino');
    const highlightColor = appleCrayonColorThreeJS('honeydew');

    guiManager = new GUIManager({ $button: $('#trace3d_ui_manager_button'), $panel: $('#trace3d_ui_manager_panel') });

    structureSelectPanel = new StructureSelectPanel({ container, panel: $('#trace3d_structure_select_panel').get(0), isHidden: guiManager.isPanelHidden('trace3d_structure_select_panel') });

    juiceboxPanel = new JuiceboxPanel({ container, panel: $('#trace3d_juicebox_panel').get(0), isHidden: guiManager.isPanelHidden('trace3d_juicebox_panel') });

    colorRampPanel = new ColorRampPanel( colorRampPanelConfigurator({ container, highlightColor }) );

    thumbnailPanel = new ThumbnailPanel(thumbnailPanelConfigurator(container));

    igvPanel = new IGVPanel({ container, panel: $('#trace3d_igv_panel').get(0), isHidden: guiManager.isPanelHidden('trace3d_igv_panel') });

    juiceboxBrowser = await juiceboxPanel.createBrowser({ container: $('#trace3d_juicebox_root_container'), width: 400, height: 400 });
    juiceboxPanel.defaultConfiguration();

    igvBrowser = await igvPanel.createBrowser(igvBrowserConfigurator(customIGVTrackHandler));

    trackLoadController = new TrackLoadController(trackLoadControllerConfigurator({ browser: igvBrowser, trackRegistryFile, $googleDriveButton: undefined } ));

    sceneManager = new SceneManager(sceneManagerConfigurator({ container, highlightColor }));
    sceneManager.defaultConfiguration();

    structureManager = new StructureManager();

    structureFileLoadModal = new DataFileLoadModal(structureFileLoadModalConfigurator());

    juiceboxFileLoadModal = new DataFileLoadModal(juiceboxFileLoadModalConfigurator());

    // dataValueMaterialProvider = new DataValueMaterialProvider({ width: 1024, height: 128, colorMinimum: appleCrayonColorRGB255('strawberry'), colorMaximum: appleCrayonColorRGB255('blueberry')  });
    // dataValueMaterialProvider = new DataValueMaterialProvider({ width: 2048, height: 64, colorMinimum: appleCrayonColorRGB255('ocean'), colorMaximum: appleCrayonColorRGB255('maraschino'), highlightColor  });
    dataValueMaterialProvider = new DataValueMaterialProvider({ width: 2048, height: 64, colorMinimum: appleCrayonColorRGB255('aluminum'), colorMaximum: appleCrayonColorRGB255('blueberry'), highlightColor:appleCrayonColorThreeJS('maraschino')  });

    noodle = new Noodle();

    ballAndStick = new BallAndStick();

    renderLoop();

    globalEventBus.subscribe('DidSelectStructure', mainEventListener);
    globalEventBus.subscribe('DidLoadFile', mainEventListener);
    globalEventBus.subscribe('ToggleAllUIControls', mainEventListener);
    globalEventBus.subscribe('RenderStyleDidChange', mainEventListener);

};

let setup = ({ structure }) => {

    noodle.configure(structure, sceneManager.materialProvider, sceneManager.renderStyle);
    ballAndStick.configure(structure, sceneManager.materialProvider, sceneManager.renderStyle);

    // noodle.configure(structure, colorRampPanel.colorRampMaterialProvider, sceneManager.renderStyle);
    // ballAndStick.configure(structure, colorRampPanel.colorRampMaterialProvider, sceneManager.renderStyle);

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

        colorRampPanel.colorRampMaterialProvider.renderLoopHelper();

        dataValueMaterialProvider.renderLoopHelper();

        sceneManager.renderer.render(sceneManager.scene, sceneManager.orbitalCamera.camera);
    }

};

export { main, setup, dataValueMaterialProvider, colorRampPanel, thumbnailPanel, noodle, ballAndStick, structureSelectPanel, igvBrowser, igvPanel, juiceboxBrowser, juiceboxPanel, trackLoadController, sceneManager, structureManager, guiManager };
