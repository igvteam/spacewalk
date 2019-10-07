import EventBus from "./eventBus.js";
import GSDB from "./gsdb.js";
import EnsembleManager from "./ensembleManager.js";
import ColorMapManager from "./colorMapManager.js";
import Parser from "./parser.js";
import SceneManager, {sceneManagerConfigurator} from "./sceneManager.js";
import DataValueMaterialProvider from "./dataValueMaterialProvider.js";
import PointCloud from "./pointCloud.js";
import Noodle from "./noodle.js";
import BallAndStick from "./ballAndStick.js";
import GUIManager from "./guiManager.js";
import { appEventListener } from "./appEventListener.js";
import { highlightColor, createGUI } from "./gui.js";
import { appleCrayonColorRGB255, appleCrayonColorThreeJS } from "./color.js";

let gsdb;

let eventBus = new EventBus();

let pointCloud;
let noodle;
let ballAndStick;
let ensembleManager;
let colorMapManager;
let parser;
let sceneManager;
let dataValueMaterialProvider;
let appWindowWidth;
let appWindowHeight;
let guiManager;

document.addEventListener("DOMContentLoaded", event => {

    gsdb = new GSDB(parser);

    parser = new Parser();

    pointCloud = new PointCloud();

    noodle = new Noodle();

    ballAndStick = new BallAndStick();

    ensembleManager = new EnsembleManager();

    colorMapManager = new ColorMapManager();
    colorMapManager.configure();

    dataValueMaterialProvider = new DataValueMaterialProvider({ width: 2048, height: 64, colorMinimum: appleCrayonColorRGB255('silver'), colorMaximum: appleCrayonColorRGB255('blueberry'), highlightColor:appleCrayonColorThreeJS('maraschino')  });

    const container = document.getElementById('spacewalk_canvas_container');
    sceneManager = new SceneManager(sceneManagerConfigurator({ container, highlightColor }));

    guiManager = new GUIManager({ $button: $('#spacewalk_ui_manager_button'), $panel: $('#spacewalk_ui_manager_panel') });

    sceneManager.setRenderStyle( guiManager.getRenderStyle() );

    createGUI(container);


    $(window).on('resize.app', () => {
        let { width, height } = container.getBoundingClientRect();
        appWindowWidth = width;
        appWindowHeight = height;

        eventBus.post({ type: "AppWindowDidResize", data: { width, height } });
    });

    eventBus.subscribe('DidSelectTrace', appEventListener);
    eventBus.subscribe('DidLoadEnsembleFile', appEventListener);
    eventBus.subscribe('ToggleAllUIControls', appEventListener);
    eventBus.subscribe('RenderStyleDidChange', appEventListener);

    renderLoop();

});

let renderLoop = () => {
    requestAnimationFrame( renderLoop );
    sceneManager.render();
};

export { appWindowWidth, appWindowHeight, eventBus, pointCloud, noodle, ballAndStick, ensembleManager, colorMapManager, parser, sceneManager, dataValueMaterialProvider, guiManager };
