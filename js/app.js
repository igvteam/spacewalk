import Globals from "./globals.js";
import ColorMapManager from "./colorMapManager.js";
import PointCloudManager from "./pointCloudManager.js";
import EnsembleManager from "./ensembleManager.js";
import {createGUI, highlightColor } from "./gui.js";
import SceneManager, {sceneManagerConfigurator} from "./sceneManager.js";
import DataValueMaterialProvider from "./dataValueMaterialProvider.js";
import {appleCrayonColorRGB255, appleCrayonColorThreeJS} from "./color.js";
import PointCloud from './pointCloud.js';
import Noodle from "./noodle.js";
import BallAndStick from "./ballAndStick.js";
import { appEventListener } from "./appEventListener.js";
import EventBus from "./eventBus.js";

document.addEventListener("DOMContentLoaded", async (event) => {

    Globals.eventBus = new EventBus();

    Globals.pointCloudManager = new PointCloudManager();

    Globals.ensembleManager = new EnsembleManager();

    Globals.colorMapManager = new ColorMapManager();
    await Globals.colorMapManager.configure();

    const container = document.getElementById('spacewalk_canvas_container');

    await createGUI(container);

    Globals.pointCloud = new PointCloud();
    Globals.noodle = new Noodle();
    Globals.ballAndStick = new BallAndStick();

    Globals.sceneManager = new SceneManager(sceneManagerConfigurator({ container, highlightColor }));

    Globals.dataValueMaterialProvider = new DataValueMaterialProvider({ width: 2048, height: 64, colorMinimum: appleCrayonColorRGB255('silver'), colorMaximum: appleCrayonColorRGB255('blueberry'), highlightColor:appleCrayonColorThreeJS('maraschino')  });

    Globals.eventBus.subscribe('DidSelectStructure', appEventListener);
    Globals.eventBus.subscribe('DidSelectPointCloud', appEventListener);
    Globals.eventBus.subscribe('DidLoadFile', appEventListener);
    Globals.eventBus.subscribe('DidLoadPointCloudFile', appEventListener);
    Globals.eventBus.subscribe('ToggleAllUIControls', appEventListener);
    Globals.eventBus.subscribe('RenderStyleDidChange', appEventListener);

    renderLoop();

});

let renderLoop = () => {
    requestAnimationFrame( renderLoop );
    Globals.sceneManager.render();
};
