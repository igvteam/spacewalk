import * as THREE from "./threejs_es6/three.module.js";
import { globalEventBus } from "./main.js";
import { numberFormatter, lerp } from './utils.js';
import {appleCrayonColorThreeJS} from "./color.js";

class TrackManager {

    constructor ({ track }) {
        this.track = track;
    }

    // Quick hack to compute segment indices containing a feature.
    async buildFeatureSegmentIndices({chr, start, step}) {


        this.featureSegmentIndices = new Set();

        const features = await this.track.getFeatures(chr);

        for (let feature of features) {

            const index = Math.floor((feature.start - start) / step);

            const one_based = 1 + index;
            if(index >= 0) {

                console.log('segmentIndex(' + one_based + ')' + ' indexBucket(' + numberFormatter(index * step) + ' - ' + numberFormatter((1 + index) * step) + ') featureStartDelta(' + numberFormatter(feature.start - start) + ')');

                // console.log(' IN - index ' + one_based + ' feature ' + numberFormatter(feature.start));
                this.featureSegmentIndices.add(one_based);
            } else {
                // console.log('OUT - index ' + one_based + ' feature ' + numberFormatter(feature.start));
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

    DEPRICATED_colorForFeatureSegmentIndex({ index, listLength }) {

        const step = index / (listLength - 1);
        const ramp = Math.floor(Math.min(255, step * 255));

        const [ red, green, blue ] = [ ramp, 0, 255 - ramp ];

        if ( this.featureSegmentIndices.has(index) ) {
            return new THREE.Color( `rgb(${red},${green},${blue})` )
        } else {
            return appleCrayonColorThreeJS('steel');
        }
    }

}

export let featureColorForInterpolant = x => {
    const value = Math.floor(lerp(0, 255, x));
    const [ red, green, blue ] = [ value, 0, 255 - value ];
    return new THREE.Color( `rgb(${red},${green},${blue})` )
};

export default TrackManager;
