import * as THREE from "../node_modules/three/build/three.module.js";
import { globals } from "./app.js";
import Parser from "./parser.js";
import { colorRampPanel } from "./gui.js";
import {includes} from "./math.js";

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

        let { chr, genomicStart, genomicEnd } = locus;

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
                                    colorRampInterpolantWindows: [],
                                };

                        }

                        const number = 1 + segmentIndex;
                        const segmentID = number.toString();

                        let colorRampInterpolantWindow =
                            {
                                start: (startBP - genomicStart) / (genomicEnd - genomicStart),
                                  end: (  endBP - genomicStart) / (genomicEnd - genomicStart),
                                interpolant: (centroidBP - genomicStart) / (genomicEnd - genomicStart),
                                sizeBP,
                                segmentID,
                                genomicLocation: centroidBP
                            };

                        colorRampInterpolantWindow.color = colorRampPanel.traceColorRampMaterialProvider.colorForInterpolant(colorRampInterpolantWindow.interpolant);

                        colorRampInterpolantWindow.material = new THREE.MeshPhongMaterial({ color: colorRampInterpolantWindow.color });

                        this.ensemble[ ensembleKey ].colorRampInterpolantWindows.push(colorRampInterpolantWindow);

                        this.ensemble[ ensembleKey ].geometry.vertices.push(new THREE.Vector3(parseFloat(x), parseFloat(y), parseFloat(z)));

                    } // if (x && y && z)

                    ++segmentIndex;

                } // for xyzList

            } // for Object.entries(trace)

            this.ensemble[ ensembleKey ].geometry.computeBoundingBox();
            this.ensemble[ ensembleKey ].geometry.computeBoundingSphere();

        } // for Object.entries(hash)

        console.timeEnd(str);

    }

    getInterpolantWindowList({ trace, interpolantList }) {
        let interpolantWindowList = [];

        for (let colorRampInterpolantWindow of trace.colorRampInterpolantWindows) {

            const { start: a, end: b } = colorRampInterpolantWindow;

            for (let interpolant of interpolantList) {

                if ( includes({ a, b, value: interpolant }) ) {
                    interpolantWindowList.push(colorRampInterpolantWindow);
                }

            }

        }

        return 0 === interpolantWindowList.length ? undefined : interpolantWindowList;
    }

    getTraceWithName(name) {
        return this.ensemble[ name ] || undefined;
    }
}

export const getBoundsWithTrace = (trace) => {
    const { center, radius } = trace.geometry.boundingSphere;
    const { min, max } = trace.geometry.boundingBox;
    return { min, max, center, radius }
};

export default EnsembleManager;
