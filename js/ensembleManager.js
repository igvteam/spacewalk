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

        this.ensemble = {};

        let { chr, genomicStart, genomicEnd } = locus;

        for (let [traceKey, trace] of Object.entries(hash)) {

            if (undefined === this.maximumSegmentID) {
                this.maximumSegmentID = Object.keys(trace).length;
            }

            const ensembleKey = traceKey.split('%').pop();

            this.ensemble[ensembleKey] = [];

            const keyValuePairs = Object.entries(trace);
            for (let keyValuePair of keyValuePairs) {

                let [ key, xyzList ] = keyValuePair;
                let segmentID = (1 + keyValuePairs.indexOf(keyValuePair)).toString();

                let { startBP, centroidBP, endBP, sizeBP } = Parser.genomicRangeFromHashKey(key);

                const positions = xyzList
                    .map(({ x, y, z }) => {

                        const exe = x ? parseFloat(x) : 'nan';
                        const wye = y ? parseFloat(y) : 'nan';
                        const zee = z ? parseFloat(z) : 'nan';

                        return { exe, wye, zee }
                    })
                    .filter(({ exe, wye, zee }) => {
                        return !(exe === 'nan' || wye === 'nan' || zee === 'nan')
                    });

                if (0 === positions.length) {
                   // positions array has no valid x, y, or z values (nan)
                   //  console.log(`ignore segment ID ${ segmentID }.`);
                } else {

                    const interpolant = (centroidBP - genomicStart) / (genomicEnd - genomicStart);
                    const color = colorRampPanel.traceColorRampMaterialProvider.colorForInterpolant(interpolant);
                    const material = new THREE.MeshPhongMaterial({color});

                    let colorRampInterpolantWindow =
                        {
                            start: (startBP - genomicStart) / (genomicEnd - genomicStart),
                            end: (endBP - genomicStart) / (genomicEnd - genomicStart),
                            interpolant,
                            sizeBP,
                            genomicLocation: centroidBP,
                            segmentID,
                            color,
                            material
                        };

                    const geometry = new THREE.BufferGeometry();

                    this.ensemble[ ensembleKey ].push( { colorRampInterpolantWindow, geometry } );

                    const list = [];
                    for(let { exe, wye, zee } of positions){
                        list.push(exe, wye, zee);
                    }

                    geometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array(list), 3 ) );

                }

            } // for Object.entries(trace)

            for (let { geometry } of this.ensemble[ ensembleKey ]) {
                geometry.computeBoundingBox();
                geometry.computeBoundingSphere();
            }

        } // for Object.entries(hash)

        console.timeEnd(str);

    }

    getTraceWithName(name) {
        return this.ensemble[ name ] || undefined;
    }

    static getInterpolantWindowList({ trace, interpolantList }) {
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
}

export const getBoundsWithTrace = (trace) => {
    const { center, radius } = trace.geometry.boundingSphere;
    const { min, max } = trace.geometry.boundingBox;
    return { min, max, center, radius }
};

export default EnsembleManager;
