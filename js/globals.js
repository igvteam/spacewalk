import {distanceMapPanel, contactFrequencyMapPanel} from "./gui.js";
import { eventBus, ensembleManager } from './app.js';

class Globals {

    constructor (container) {

        let { width, height } = container.getBoundingClientRect();
        this.appWindowWidth = width;
        this.appWindowHeight = height;

        eventBus.subscribe('DidLoadEnsembleFile', this);

    }

    initialize(container) {
    }

    receiveEvent({ type, data }) {

        const { isPointCloud } = data;

        if ('DidLoadEnsembleFile' === type && false === isPointCloud) {

            this.sharedMapArray = new Array(ensembleManager.maximumSegmentID * ensembleManager.maximumSegmentID);

            this.sharedContactFrequencyMapUint8ClampedArray = new Uint8ClampedArray(ensembleManager.maximumSegmentID * ensembleManager.maximumSegmentID * 4);
            this.sharedDistanceMapUint8ClampedArray = new Uint8ClampedArray(ensembleManager.maximumSegmentID * ensembleManager.maximumSegmentID * 4);

            contactFrequencyMapPanel.updateEnsembleContactFrequencyCanvas(ensembleManager.ensemble);
            distanceMapPanel.updateEnsembleAverageDistanceCanvas(ensembleManager.ensemble);
        }
    }
}

export default Globals;
