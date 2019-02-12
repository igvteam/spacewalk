import * as THREE from "./threejs_es6/three.module.js";
import { globalEventBus } from "./main.js";
import { numberFormatter } from './utils.js';
import {appleCrayonColorThreeJS} from "./color.js";

class TrackManager {

    constructor ({ track }) {
        this.track = track;
    }

    // Compute the segment indexes containing a feature.  Quick hack, this is not the right place to do this but
    // I don't know how to change sphere color after its placed in scene
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

        globalEventBus.post({type: "DidLoadTrack", data: this.featureSegmentIndices });

    }

    colorForFeatureSegmentIndex({ index, listLength }) {

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

export default TrackManager;
