import * as THREE from "./threejs_es6/three.module.js";
import { globalEventBus } from "./main.js";
import { numberFormatter } from './utils.js';
import { lerp } from './math.js';
import {appleCrayonColorThreeJS} from "./color.js";

class TrackManager {

    constructor ({ track }) {
        this.track = track;
    }

    // Quick hack to compute segment indices containing a feature.
    async buildFeatureSegmentIndices({chr, start, stepSize}) {

        this.featureSegmentIndices = new Set();

        const features = await this.track.getFeatures(chr);

        for (let feature of features) {

            const index = Math.floor((feature.start - start) / stepSize);

            const one_based = 1 + index;
            if(index >= 0) {
                // console.log('segmentIndex(' + one_based + ')' + ' indexBucket(' + numberFormatter(index * stepSize) + ' - ' + numberFormatter((1 + index) * stepSize) + ') featureStartDelta(' + numberFormatter(feature.start - start) + ')');
                this.featureSegmentIndices.add(one_based);
            }
        }

        // [ this.minIndex, this.maxIndex ] = [...this.featureSegmentIndices].reduce((accumulator, index) => {
        //     accumulator = [ Math.min(accumulator[ 0 ], index), Math.max(accumulator[ 1 ], index), ];
        //     return accumulator;
        // }, [ Number.MAX_VALUE, -Number.MAX_VALUE ]);

        globalEventBus.post({type: "DidLoadTrack", data: this.featureSegmentIndices });

    }

    colorForSegmentIndex({index, firstIndex, lastIndex}) {

        if (!this.featureSegmentIndices.has(index)) {
            return appleCrayonColorThreeJS('steel');
        } else {
            const x = (index - firstIndex)/(lastIndex - firstIndex);
            return featureColorForInterpolant(x);
        }

    }
}

export let featureColorStringForInterpolant = x => {
    const value = Math.floor(lerp(0, 255, x));
    const [ red, green, blue ] = [ value, 0, 255 - value ];
    return `rgb(${red},${green},${blue})`;
};

export let featureColorForInterpolant = x => {
    return new THREE.Color( featureColorStringForInterpolant(x) );
};

export default TrackManager;
