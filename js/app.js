import { appEventListener } from "./appEventListener.js";
import { highlightColor, guiManager, createGUI } from "./gui.js";
import Globals from "./globals.js";
import GSDB from "./gsdb.js";
import EventBus from "./eventBus.js";
import EnsembleManager from "./ensembleManager.js";
import ColorMapManager from "./colorMapManager.js";
import Parser from "./parser.js";
import SceneManager, {sceneManagerConfigurator} from "./sceneManager.js";
import DataValueMaterialProvider from "./dataValueMaterialProvider.js";
import {appleCrayonColorRGB255, appleCrayonColorThreeJS} from "./color.js";
import PointCloud from "./pointCloud.js";
import Noodle from "./noodle.js";
import BallAndStick from "./ballAndStick.js";

let eventBus = new EventBus();
let pointCloud;
let noodle;
let ballAndStick;
let ensembleManager;
let colorMapManager;
let parser;
let sceneManager;
let dataValueMaterialProvider;
let gsdb;

let globals;

document.addEventListener("DOMContentLoaded", event => {

    const container = document.getElementById('spacewalk_canvas_container');

    globals = new Globals(container);
    globals.initialize(container);

    pointCloud = new PointCloud();

    noodle = new Noodle();

    ballAndStick = new BallAndStick();

    ensembleManager = new EnsembleManager();

    colorMapManager = new ColorMapManager();
    colorMapManager.configure();

    parser = new Parser();

    sceneManager = new SceneManager(sceneManagerConfigurator({ container, highlightColor }));

    dataValueMaterialProvider = new DataValueMaterialProvider({ width: 2048, height: 64, colorMinimum: appleCrayonColorRGB255('silver'), colorMaximum: appleCrayonColorRGB255('blueberry'), highlightColor:appleCrayonColorThreeJS('maraschino')  });

    gsdb = new GSDB(parser);

    createGUI(container);

    sceneManager.setRenderStyle( guiManager.getRenderStyle() );

    $(window).on('resize.app', () => {
        let { width, height } = container.getBoundingClientRect();
        globals.appWindowWidth = width;
        globals.appWindowHeight = height;
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

export { eventBus, pointCloud, noodle, ballAndStick, ensembleManager, colorMapManager, parser, sceneManager, dataValueMaterialProvider, globals };
