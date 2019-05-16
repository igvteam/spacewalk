import * as THREE from "./threejs_es6/three.module.js";
import { globalEventBus } from './eventBus.js';
import SceneManager from './sceneManager.js';
import StructureManager from './structureManager.js';

import { createGUI, thumbnailPanel, highlightColor } from './gui.js';

import BallAndStick from './ballAndStick.js';
import Noodle from './noodle.js';

import DataValueMaterialProvider from './dataValueMaterialProvider.js';

import { sceneManagerConfigurator } from './sceneManager.js';

import { mainEventListener } from './mainEventListener.js';
import { appleCrayonColorThreeJS, appleCrayonColorRGB255 } from "./color.js";

let sceneManager;
let structureManager;

let noodle;
let ballAndStick;

let dataValueMaterialProvider;

let main = async container => {

    structureManager = new StructureManager();

    await createGUI(container);

    sceneManager = new SceneManager(sceneManagerConfigurator({ container, highlightColor }));
    sceneManager.defaultConfiguration();
    
    dataValueMaterialProvider = new DataValueMaterialProvider({ width: 2048, height: 64, colorMinimum: appleCrayonColorRGB255('silver'), colorMaximum: appleCrayonColorRGB255('blueberry'), highlightColor:appleCrayonColorThreeJS('maraschino')  });

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

    let scene = new THREE.Scene();

    noodle.addToScene(scene);
    ballAndStick.addToScene(scene);

    const { min, max, center, radius } = ballAndStick.getBounds();
    const { position, fov } = ballAndStick.getCameraPoseAlongAxis({ axis: '+z', scaleFactor: 3 });

    sceneManager.configure({scene, min, max, boundingDiameter: (2 * radius), cameraPosition: position, centroid: center, fov});

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

        sceneManager.materialProvider.renderLoopHelper();

        dataValueMaterialProvider.renderLoopHelper();

        sceneManager.renderer.render(sceneManager.scene, sceneManager.orbitalCamera.camera);
    }

};

export { main, setup, dataValueMaterialProvider, noodle, ballAndStick, sceneManager, structureManager };
