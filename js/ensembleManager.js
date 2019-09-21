import * as THREE from "../node_modules/three/build/three.module.js";
import { globals } from "./app.js";
import Parser from "./parser.js";

class EnsembleManager {

    constructor () {
    }

    ingestSW({ locus, hash }) {

        const str = 'EnsembleManager ingestSW';
        console.time(str);

        // maximumSegmentID is used to size the distance and contact maps which
        // are N by N where N = maximumSegmentID.
        // Because trace data often has missing xyz values the total number of
        // segments cannot be assumed to be the same for each trace in the ensemble.
        // We use  maximumSegmentID to ensure all traces will map to the contact
        // and distance maps.
        this.maximumSegmentID = undefined;

        // the genomic distance (bp) between centroids
        this.stepSize = undefined;

        this.ensemble = {};
        for (let [traceKey, trace] of Object.entries(hash)) {

            if (undefined === this.maximumSegmentID) {
                this.maximumSegmentID = Object.keys(trace).length;
            }

            let segmentIndex = 0;

            const ensembleKey = traceKey.split('%').pop();

            for (let [ key, xyzList ] of Object.entries(trace)) {

                let { startBP, centroidBP, endBP, sizeBP } = Parser.genomicRangeFromHashKey(key);

                if (undefined === this.stepSize) {
                    this.stepSize = sizeBP;
                }

                for (let { x, y, z } of xyzList) {

                    if (x && y && z) {


                        if (undefined === this.ensemble[ ensembleKey ]) {

                            this.ensemble[ ensembleKey ] =
                                {
                                    geometry: new THREE.Geometry(),
                                    segmentList: [],
                                    material: new THREE.MeshPhongMaterial()
                                };

                        }

                        this.ensemble[ ensembleKey ].geometry.vertices.push(new THREE.Vector3(parseFloat(x), parseFloat(y), parseFloat(z)));

                        const number = 1 + segmentIndex;
                        const segmentID = number.toString();
                        this.ensemble[ ensembleKey ].segmentList.push({ segmentID, genomicLocation: centroidBP });

                    } // if (x && y && z)

                    ++segmentIndex;

                } // for xyzList

            } // for Object.entries(trace)

            this.ensemble[ ensembleKey ].geometry.computeBoundingBox();
            this.ensemble[ ensembleKey ].geometry.computeBoundingSphere();

        } // for Object.entries(hash)

        console.timeEnd(str);

    }

    getTraceWithName(name) {
        return this.ensemble[ name ] || undefined;
    }

    segmentIDForGenomicLocation(bp) {

        let delta = Math.round(bp - globals.parser.locus.genomicStart);
        let segmentID = 1 + Math.floor(delta / this.stepSize);
        return segmentID;
    }
}

export const getBoundsWithTrace = (trace) => {
    const { center, radius } = trace.geometry.boundingSphere;
    const { min, max } = trace.geometry.boundingBox;
    return { min, max, center, radius }
};

const segmentIDSanityCheck = ensemble => {

    const ensembleList = Object.values(ensemble);

    let mapSize = globals.ensembleManager.maximumSegmentID;

    let matrix = new Array(mapSize * mapSize);
    for (let f = 0; f < matrix.length; f++) matrix[ f ] = 0;

    console.time(`segmentIDSanityCheck. ${ ensembleList.length } traces.`);

    for (let trace of ensembleList) {

        let { vertices } = trace.geometry;
        for (let i = 0; i < vertices.length; i++) {

            if (trace.segmentList[ i ].segmentID > globals.ensembleManager.maximumSegmentID) {
                console.log(`Bogus Segment ID. trace ${ ensembleList.indexOf(trace) } vertex ${ i } segmentID ${ trace.segmentList[ i ].segmentID } maximumSegmentID ${ globals.ensembleManager.maximumSegmentID }`);
            }
            const segmentID = trace.segmentList[ i ].segmentID;
            const  index = segmentID - 1;

            const xy = index * mapSize + index;
            if (xy > matrix.length) {
                console.log('xy is bogus index ' + xy);
            }

        }

    }

    console.timeEnd(`segmentIDSanityCheck. ${ ensembleList.length } traces.`);

};

export default EnsembleManager;
