import EventBus from "./eventBus.js";
import Parser from "./parser.js";
import PointCloudManager from "./pointCloudManager.js";
import EnsembleManager from "./ensembleManager.js";
import ColorMapManager from "./colorMapManager.js";
import PointCloud from "./pointCloud.js";
import Noodle from "./noodle.js";
import BallAndStick from "./ballAndStick.js";
import DataValueMaterialProvider from "./dataValueMaterialProvider.js";
import {appleCrayonColorRGB255, appleCrayonColorThreeJS} from "./color.js";
import SceneManager, {sceneManagerConfigurator} from "./sceneManager.js";
import {highlightColor} from "./gui.js";

class Globals {
    constructor () {

        this.parser = undefined;

        this.eventBus = undefined;

        this.pointCloudManager = undefined;
        this.ensembleManager = undefined;

        this.colorMapManager = undefined;

        this.appWindowWidth = undefined;
        this.appWindowHeight = undefined;

        this.pointCloud = undefined;
        this.noodle = undefined;
        this.ballAndStick = undefined;

        this.sceneManager = undefined;

        this.dataValueMaterialProvider = undefined;

        this.mapCanvas = undefined;

    }

    initialize(container) {

        this.parser = new Parser();

        this.eventBus = new EventBus();
        this.eventBus.subscribe('DidLoadEnsembleFile', this);

        this.pointCloudManager = new PointCloudManager();
        this.ensembleManager = new EnsembleManager();

        this.colorMapManager = new ColorMapManager();
        this.colorMapManager.configure();

        let { width, height } = container.getBoundingClientRect();
        this.appWindowWidth = width;
        this.appWindowHeight = height;

        this.pointCloud = new PointCloud();
        this.noodle = new Noodle();
        this.ballAndStick = new BallAndStick();

        this.sceneManager = new SceneManager(sceneManagerConfigurator({ container, highlightColor }));

        this.dataValueMaterialProvider = new DataValueMaterialProvider({ width: 2048, height: 64, colorMinimum: appleCrayonColorRGB255('silver'), colorMaximum: appleCrayonColorRGB255('blueberry'), highlightColor:appleCrayonColorThreeJS('maraschino')  });

        this.mapCanvas = document.createElement('canvas');

    }
}

export default Globals;
