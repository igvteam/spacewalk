import Globals from "./globals.js";
import ColorMapManager from "./colorMapManager.js";
import EnsembleManager from "./ensembleManager.js";
import {createGUI, highlightColor } from "./gui.js";
import SceneManager, {sceneManagerConfigurator} from "./sceneManager.js";
import DataValueMaterialProvider from "./dataValueMaterialProvider.js";
import {appleCrayonColorRGB255, appleCrayonColorThreeJS} from "./color.js";
import Noodle from "./noodle.js";
import BallAndStick from "./ballAndStick.js";
import {appEventListener} from "./appEventListener.js";

document.addEventListener("DOMContentLoaded", async (event) => {

    Globals.ensembleManager = new EnsembleManager();

    Globals.colorMapManager = new ColorMapManager();
    await Globals.colorMapManager.configure();

    const container = document.getElementById('spacewalk_canvas_container');

    await createGUI(container);

    Globals.noodle = new Noodle();
    Globals.ballAndStick = new BallAndStick();

    Globals.sceneManager = new SceneManager(sceneManagerConfigurator({ container, highlightColor }));

    Globals.dataValueMaterialProvider = new DataValueMaterialProvider({ width: 2048, height: 64, colorMinimum: appleCrayonColorRGB255('silver'), colorMaximum: appleCrayonColorRGB255('blueberry'), highlightColor:appleCrayonColorThreeJS('maraschino')  });

    Globals.eventBus.subscribe('DidSelectStructure', appEventListener);
    Globals.eventBus.subscribe('DidLoadEnsembleFile', appEventListener);
    Globals.eventBus.subscribe('ToggleAllUIControls', appEventListener);
    Globals.eventBus.subscribe('RenderStyleDidChange', appEventListener);

    renderLoop();

});

let renderLoop = () => {
    requestAnimationFrame( renderLoop );
    Globals.sceneManager.render();
};
