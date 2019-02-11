import { numberFormatter } from './utils.js';

class Trace3DTrack {

    constructor ({ bedTrack }) {
        this.bedTrack = bedTrack;
    }

    // Compute the segment indexes containing a feature.  Quick hack, this is not the right place to do this but
    // I don't know how to change sphere color after its placed in scene
    async getFeatureSegmentIndices({chr, start, step}) {

        let segmentIndices = new Set();

        const features = await this.bedTrack.getFeatures(chr);

        for (let feature of features) {


            const index = Math.floor((feature.start - start) / step);

            const one_based = 1 + index;
            if(index >= 0) {
                // console.log(' IN - index ' + one_based + ' feature ' + numberFormatter(feature.start));
                segmentIndices.add(one_based);
            } else {
                // console.log('OUT - index ' + one_based + ' feature ' + numberFormatter(feature.start));
            }
        }

        return segmentIndices;
    }

}

export default Trace3DTrack;
