
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

            // Segment index (first sgement is 1)
            const index = 1 + Math.floor((feature.start - start) / step);

            if(index >= 0) {
                segmentIndices.add(index);
            } else {
                console.log('NO segment index for genomic location ' + feature.start);
            }
        }

        return segmentIndices;
    }

}

export default Trace3DTrack;
