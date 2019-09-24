import EventBus from "./eventBus.js";
import Parser from "./parser.js";
import EnsembleManager from "./ensembleManager.js";
import ColorMapManager from "./colorMapManager.js";
import PointCloud from "./pointCloud.js";
import Noodle from "./noodle.js";
import BallAndStick from "./ballAndStick.js";
import DataValueMaterialProvider from "./dataValueMaterialProvider.js";
import {appleCrayonColorRGB255, appleCrayonColorThreeJS} from "./color.js";
import SceneManager, {sceneManagerConfigurator} from "./sceneManager.js";
import {highlightColor, distanceMapPanel, contactFrequencyMapPanel} from "./gui.js";

class Globals {

    constructor (container) {

        this.parser = new Parser();

        this.eventBus = new EventBus();

        this.ensembleManager = new EnsembleManager();

        this.pointCloud = new PointCloud();
        this.noodle = new Noodle();
        this.ballAndStick = new BallAndStick();

        this.colorMapManager = new ColorMapManager();

        let { width, height } = container.getBoundingClientRect();
        this.appWindowWidth = width;
        this.appWindowHeight = height;

        this.sceneManager = undefined;

        this.dataValueMaterialProvider = undefined;

        // shared by distance/contact map buffers
        this.sharedMapArray = undefined;
        this.sharedContactFrequencyMapUint8ClampedArray = undefined;
        this.sharedDistanceMapUint8ClampedArray = undefined;

        this.eventBus.subscribe('DidLoadEnsembleFile', this);

    }

    initialize(container) {

        this.colorMapManager.configure();

        this.sceneManager = new SceneManager(sceneManagerConfigurator({ container, highlightColor }));

        this.dataValueMaterialProvider = new DataValueMaterialProvider({ width: 2048, height: 64, colorMinimum: appleCrayonColorRGB255('silver'), colorMaximum: appleCrayonColorRGB255('blueberry'), highlightColor:appleCrayonColorThreeJS('maraschino')  });

    }

    receiveEvent({ type, data }) {

        const { isPointCloud } = data;

        if ('DidLoadEnsembleFile' === type && false === isPointCloud) {

            this.sharedMapArray = new Array(this.ensembleManager.maximumSegmentID * this.ensembleManager.maximumSegmentID);

            this.sharedContactFrequencyMapUint8ClampedArray = new Uint8ClampedArray(this.ensembleManager.maximumSegmentID * this.ensembleManager.maximumSegmentID * 4);
                    this.sharedDistanceMapUint8ClampedArray = new Uint8ClampedArray(this.ensembleManager.maximumSegmentID * this.ensembleManager.maximumSegmentID * 4);

            contactFrequencyMapPanel.updateEnsembleContactFrequencyCanvas(this.ensembleManager.ensemble);
            distanceMapPanel.updateEnsembleAverageDistanceCanvas(this.ensembleManager.ensemble);
        }
    }
}

export default Globals;
