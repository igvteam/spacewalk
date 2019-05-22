import * as THREE from "../node_modules/three/build/three.module.js";
import EnsembleManager from './ensembleManager.js';
import { createGUI, thumbnailPanel, highlightColor } from './gui.js';
import SceneManager, { sceneManagerConfigurator } from './sceneManager.js';
import DataValueMaterialProvider from './dataValueMaterialProvider.js';
import Noodle from './noodle.js';
import BallAndStick from './ballAndStick.js';

import { globalEventBus } from './eventBus.js';
import { mainEventListener } from './mainEventListener.js';
import { appleCrayonColorThreeJS, appleCrayonColorRGB255 } from "./color.js";

let ensembleManager;
let sceneManager;
let dataValueMaterialProvider;
let noodle;
let ballAndStick;

let main = async container => {

    ensembleManager = new EnsembleManager();

    await createGUI(container);

    sceneManager = new SceneManager(sceneManagerConfigurator({ container, highlightColor }));
    sceneManager.defaultConfiguration();

    dataValueMaterialProvider = new DataValueMaterialProvider({ width: 2048, height: 64, colorMinimum: appleCrayonColorRGB255('silver'), colorMaximum: appleCrayonColorRGB255('blueberry'), highlightColor:appleCrayonColorThreeJS('maraschino')  });

    noodle = new Noodle();
    ballAndStick = new BallAndStick();

    globalEventBus.subscribe('DidSelectStructure', mainEventListener);
    globalEventBus.subscribe('DidLoadFile', mainEventListener);
    globalEventBus.subscribe('ToggleAllUIControls', mainEventListener);
    globalEventBus.subscribe('RenderStyleDidChange', mainEventListener);

    renderLoop();

};

let setup = ({ trace }) => {

    noodle.configure(ensembleManager.locus, trace, sceneManager.materialProvider, sceneManager.renderStyle);
    ballAndStick.configure(trace, sceneManager.materialProvider, sceneManager.renderStyle);

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
    sceneManager.render();
};

export { main, setup, dataValueMaterialProvider, noodle, ballAndStick, sceneManager, ensembleManager };
