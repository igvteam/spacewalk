import * as THREE from "../node_modules/three/build/three.module.js";
import Globals from './globals.js';
import { hideSpinner, showSpinner, distanceMapPanel, contactFrequencyMapPanel } from './gui.js';
import { getEnsembleAverageDistanceCanvas } from './distanceMapPanel.js';
import { getEnsembleContactFrequencyCanvas } from './contactFrequencyMapPanel.js';

class EnsembleManager {

    constructor () {
    }

    ingestSW({ locus, hash }) {

        // maximumSegmentID is used to size the distance and contact maps which
        // are N by N where N = maximumSegmentID.
        // Because trace data often has missing xyz values the total number of
        // segments cannot be assumed to be the same for each trace in the ensemble.
        // We use  maximumSegmentID to ensure all traces will map to the contact
        // and distance maps.
        this.maximumSegmentID = undefined;

        // the genomic distance (bp) between centroids
        this.stepSize = undefined;

        let dictionary = {};
        for (let [hashKey, trace] of Object.entries(hash)) {

            // console.log(`:::::::::::::::::::: ${ hashKey } ::::::::::::::::::::`);

            if (undefined === this.maximumSegmentID) {
                this.maximumSegmentID = Object.keys(trace).length;
            }

            const segments = Object.values(trace);
            for (let segment of segments) {

                let { startBP, endBP, x, y, z } = segment[ 0 ];
                if (x /* && y && y */) {

                    const genomicLocation = (parseFloat(startBP) + parseFloat(endBP)) / 2.0;

                    if (undefined === this.stepSize) {
                        this.stepSize = parseFloat(endBP) - parseFloat(startBP);
                    }


                    x = parseFloat(x);
                    y = parseFloat(y);
                    z = parseFloat(z);

                    let segmentID = 1 + segments.indexOf(segment);
                    segmentID = segmentID.toString();

                    const key = hashKey.split('%').pop();

                    if (undefined === dictionary[ key ]) {
                        dictionary[ key ] = [];
                    }

                    dictionary[ key ].push({ segmentID, genomicLocation, x, y, z })

                }
            }
        }

        let keys = Object.keys(dictionary);

        // transform and augment dictionary into ensemble
        this.ensemble = {};
        for (let key of keys) {

            let list = dictionary[ key ];

            let segmentList = list.map(o => {
                let { segmentID, genomicLocation } = o;
                return { segmentID, genomicLocation }
            });

            let geometry = new THREE.Geometry();

            geometry.vertices = list.map(o => {
                let { x, y, z } = o;
                return new THREE.Vector3(x, y, z);
            });

            geometry.computeBoundingBox();
            geometry.computeBoundingSphere();

            let material = new THREE.MeshPhongMaterial();

            // console.log(`trace ${ key } vertices ${ geometry.vertices.length }`);

            this.ensemble[ key ] = { segmentList, geometry, material };
        }

        dictionary = null;

        showSpinner();

        window.setTimeout(() => {
            contactFrequencyMapPanel.drawEnsembleContactFrequency(getEnsembleContactFrequencyCanvas(this.ensemble, contactFrequencyMapPanel.distanceThreshold));
            distanceMapPanel.drawEnsembleDistanceCanvas(getEnsembleAverageDistanceCanvas(this.ensemble));
            // hideSpinner();
        }, 500);

        const { chr, genomicStart, genomicEnd } = locus;

        Globals.eventBus.post({ type: "DidLoadFile", data: { genomeID: Globals.parser.genomeAssembly, chr, genomicStart, genomicEnd, initialKey: '0' } });

    }

    getTraceWithName(name) {
        return this.ensemble[ name ] || undefined;
    }

    segmentIDForGenomicLocation(bp) {

        let delta = Math.round(bp - Globals.parser.locus.genomicStart);
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

    let mapSize = Globals.ensembleManager.maximumSegmentID;

    let matrix = new Array(mapSize * mapSize);
    for (let f = 0; f < matrix.length; f++) matrix[ f ] = 0;

    console.time(`segmentIDSanityCheck. ${ ensembleList.length } traces.`);

    for (let trace of ensembleList) {

        let { vertices } = trace.geometry;
        for (let i = 0; i < vertices.length; i++) {

            if (trace.segmentList[ i ].segmentID > Globals.ensembleManager.maximumSegmentID) {
                console.log(`Bogus Segment ID. trace ${ ensembleList.indexOf(trace) } vertex ${ i } segmentID ${ trace.segmentList[ i ].segmentID } maximumSegmentID ${ Globals.ensembleManager.maximumSegmentID }`);
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
