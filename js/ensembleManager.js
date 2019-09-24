import * as THREE from "../node_modules/three/build/three.module.js";
import { globals } from "./app.js";
import Parser from "./parser.js";
import { colorRampPanel } from "./gui.js";
import { includes, degrees } from "./math.js";
import {appleCrayonColorThreeJS} from "./color.js";

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

        this.isPointCloud = undefined;

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

                if (undefined === this.isPointCloud) {
                    this.isPointCloud = xyzList.length > 1;
                }

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
                } else {

                    const interpolant = (centroidBP - genomicStart) / (genomicEnd - genomicStart);

                    let colorRampInterpolantWindow =
                        {
                            start: (startBP - genomicStart) / (genomicEnd - genomicStart),
                            end: (endBP - genomicStart) / (genomicEnd - genomicStart),
                            interpolant,
                            sizeBP,
                            genomicLocation: centroidBP,
                            segmentIndex: keyValuePairs.indexOf(keyValuePair)
                        };

                    const geometry = new THREE.BufferGeometry();

                    geometry.userData.color = colorRampPanel.traceColorRampMaterialProvider.colorForInterpolant(interpolant);
                    geometry.userData.deemphasizedColor = appleCrayonColorThreeJS('magnesium');

                    geometry.userData.material = new THREE.MeshPhongMaterial({ color: geometry.userData.color });

                    const xyz = [];
                    const rgb = [];
                    for(let { exe, wye, zee } of positions){

                        xyz.push(exe, wye, zee);

                        const { r, g, b } = geometry.userData.color;
                        rgb.push(r, g, b);
                    }

                    geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( xyz, 3 ) );
                    geometry.addAttribute(    'color', new THREE.Float32BufferAttribute( rgb, 3 ).setDynamic( this.isPointCloud ) );

                    this.ensemble[ ensembleKey ].push( { colorRampInterpolantWindow, geometry } );

                }

            }

        }

        console.timeEnd(str);

        globals.eventBus.post({ type: "DidLoadEnsembleFile", data: { isPointCloud: this.isPointCloud, genomeID: globals.parser.genomeAssembly, chr, genomicStart, genomicEnd, initialKey: '0' } });

    }

    getTraceWithName(name) {
        return this.ensemble[ name ] || undefined;
    }

    static getInterpolantWindowList({ trace, interpolantList }) {

        let interpolantWindowList = [];

        const traceValues = Object.values(trace);
        for (let i = 0; i < traceValues.length; i++) {

            let { colorRampInterpolantWindow } = traceValues[ i ];

            const { start: a, end: b } = colorRampInterpolantWindow;

            for (let interpolant of interpolantList) {

                if ( includes({ a, b, value: interpolant }) ) {
                    interpolantWindowList.push({ colorRampInterpolantWindow, index: i });
                }

            }

        }

        return 0 === interpolantWindowList.length ? undefined : interpolantWindowList;
    }

    static getBoundsWithTrace(trace){

        const boundingBox = new THREE.Box3();

        let probe = new THREE.Vector3();
        for (let { geometry } of Object.values(trace)) {

            let xyz = geometry.getAttribute('position');
            for (let a = 0; a < xyz.count; a++) {

                const [ x, y, z ] = [ xyz.getX(a), xyz.getY(a), xyz.getZ(a) ];
                probe.set(x, y, z);

                boundingBox.expandByPoint(probe);
            }

        }

        const { min, max } = boundingBox;

        const boundingSphere = new THREE.Sphere();
        boundingBox.getBoundingSphere(boundingSphere);
        const { center, radius } = boundingSphere;

        return { min, max, center, radius }
    };

    static getCameraPoseAlongAxis ({ trace, axis, scaleFactor }) {

        const { center, radius } = EnsembleManager.getBoundsWithTrace(trace);

        const dimen = scaleFactor * radius;

        const theta = Math.atan(radius/dimen);
        const fov = degrees( 2 * theta);

        const axes =
            {
                '-x': () => {
                    return new THREE.Vector3(-dimen, 0, 0);
                },
                '+x': () => {
                    return new THREE.Vector3(dimen, 0, 0);
                },
                '-y': () => {
                    return new THREE.Vector3(0, -dimen, 0);
                },
                '+y': () => {
                    return new THREE.Vector3(0, dimen, 0);
                },
                '-z': () => {
                    return new THREE.Vector3(0, 0, -dimen);
                },
                '+z': () => {
                    return new THREE.Vector3(0, 0, dimen);
                },
            };

        const vector = axes[ axis ]();
        let position = new THREE.Vector3();

        position.addVectors(center, vector);

        return { target:center, position, fov }
    }

    static getSingleCentroidVerticesWithTrace(trace) {

        return Object.values(trace)
            .map(({ geometry }) => {
                const [ x, y, z ] = geometry.getAttribute('position').array;
                return new THREE.Vector3(x, y, z);
            });

    }
}

export default EnsembleManager;
