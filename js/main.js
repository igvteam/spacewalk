import * as THREE from "../node_modules/three/build/three.module.js";
import EnsembleManager from './ensembleManager.js';
import { createGUI, thumbnailPanel, distanceMapPanel, highlightColor } from './gui.js';
import { getDistanceMapCanvasWithTrace } from './ensembleManager.js';
import SceneManager, { sceneManagerConfigurator } from './sceneManager.js';
import DataValueMaterialProvider from './dataValueMaterialProvider.js';
import Noodle from './noodle.js';
import BallAndStick from './ballAndStick.js';

import { globalEventBus } from './eventBus.js';
import { mainEventListener } from './mainEventListener.js';
import { appleCrayonColorThreeJS, appleCrayonColorRGB255 } from "./color.js";
import ColorMapManager from "./colorMapManager.js";

let ensembleManager;
let sceneManager;
let dataValueMaterialProvider;
let noodle;
let ballAndStick;
let colorMapManager;

let main = async container => {

    colorMapManager = new ColorMapManager();
    await colorMapManager.configure();

    const colormaps =
        {
            peter_kovesi_rainbow_bgyr_35_85_c72_n256: 'resources/colormaps/peter_kovesi/CET-R2.csv'
        };

    for (let key of Object.keys(colormaps)) {
        colorMapManager.addMap({name: key, path: colormaps[key]});
    }

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

    distanceMapPanel.draw(getDistanceMapCanvasWithTrace(trace));

};

let renderLoop = () => {
    requestAnimationFrame( renderLoop );
    sceneManager.render();
};

export { main, setup, colorMapManager, dataValueMaterialProvider, noodle, ballAndStick, sceneManager, ensembleManager };
