import { numberFormatter } from './utils.js';
import * as THREE from "./threejs_es6/three.module.js";

class Trace3DTrack {

    constructor ({ bedTrack }) {
        this.bedTrack = bedTrack;
    }

    // Compute the segment indexes containing a feature.  Quick hack, this is not the right place to do this but
    // I don't know how to change sphere color after its placed in scene
    async buildFeatureSegmentIndices({chr, start, step}) {


        this.featureSegmentIndices = new Set();

        const features = await this.bedTrack.getFeatures(chr);

        for (let feature of features) {

            const index = Math.floor((feature.start - start) / step);

            const one_based = 1 + index;
            if(index >= 0) {

                console.log('index(' + index  + ') segmentIndex(' + one_based + ')' + ' featureStartDelta ' + numberFormatter(feature.start - start) + ' window(' + numberFormatter(index * step) + ' - ' + numberFormatter((1 + index) * step) + ')') ;

                // console.log(' IN - index ' + one_based + ' feature ' + numberFormatter(feature.start));
                this.featureSegmentIndices.add(one_based);
            } else {
                // console.log('OUT - index ' + one_based + ' feature ' + numberFormatter(feature.start));
            }
        }

    }

    colorForFeatureSegmentIndex(index) {

        const step = index / 60;
        const ramp = Math.floor(Math.min(255, step * 255));

        const [ red, green, blue ] = [ ramp, 0, 255 - ramp ];

        return new THREE.Color( this.featureSegmentIndices.has(index) ? 'rgb(0, 255, 0)' : `rgb(${red},${green},${blue})` )
    }

}

export default Trace3DTrack;
