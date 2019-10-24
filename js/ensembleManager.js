import * as THREE from "../node_modules/three/build/three.module.js";
import Parser from "./parser.js";
import { eventBus, colorRampMaterialProvider, contactFrequencyMapPanel, distanceMapPanel } from "./app.js";
import { includes, degrees } from "./math.js";
import {appleCrayonColorThreeJS} from "./color.js";

class EnsembleManager {

    constructor () {
    }

    ingest(payload) {

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

        let { sample, genomeAssembly, locus, traces } = payload;
        this.genomeAssembly = genomeAssembly;

        let { chr, genomicStart, genomicEnd } = locus;
        this.locus = locus;

        for (let [traceKey, trace] of Object.entries(traces)) {

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
                    .filter(({ x, y, z }) => {
                        return !(x === 'nan' || y === 'nan' || z === 'nan')
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

                    geometry.userData.color = colorRampMaterialProvider.colorForInterpolant(interpolant);
                    geometry.userData.deemphasizedColor = appleCrayonColorThreeJS('magnesium');

                    geometry.userData.material = new THREE.MeshPhongMaterial({ color: geometry.userData.color });

                    const xyz = [];
                    const rgb = [];
                    for(let { x, y, z } of positions){

                        xyz.push(x, y, z);

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

        if (false === this.isPointCloud) {

            // update shared buffers for distance and contact-frequency maps

            this.sharedMapArray = new Array(this.maximumSegmentID * this.maximumSegmentID);

            this.sharedContactFrequencyMapUint8ClampedArray = new Uint8ClampedArray(this.maximumSegmentID * this.maximumSegmentID * 4);
            this.sharedDistanceMapUint8ClampedArray = new Uint8ClampedArray(this.maximumSegmentID * this.maximumSegmentID * 4);

            contactFrequencyMapPanel.updateEnsembleContactFrequencyCanvas(this.ensemble);
            distanceMapPanel.updateEnsembleAverageDistanceCanvas(this.ensemble);
        }

        const initialKey = '0';
        this.currentTrace = this.getTraceWithName(initialKey);
        eventBus.post({ type: "DidLoadEnsembleFile", data: { sample, genomeAssembly, chr, genomicStart, genomicEnd, initialKey, trace: this.currentTrace } });

    }

    getTraceKey(trace) {

        for (let [key, value] of Object.entries(this.ensemble)) {
            if (trace === value) {
                return key;
            }
        }

        return undefined;
    }

    getTraceWithName(name) {
        return this.ensemble[ name ] || undefined;
    }

    static getInterpolantWindowList({ trace, interpolantList }) {

        let interpolantWindowList = [];


        const colorRampInterpolantWindows = Object.values(trace).map(({ colorRampInterpolantWindow }) => colorRampInterpolantWindow);

        for (let colorRampInterpolantWindow of colorRampInterpolantWindows) {

            let { start: a, end: b, sizeBP } = colorRampInterpolantWindow;

            for (let interpolant of interpolantList) {

                if ( includes({ a, b, value: interpolant }) ) {
                    interpolantWindowList.push({ colorRampInterpolantWindow, index: colorRampInterpolantWindows.indexOf(colorRampInterpolantWindow) });
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

    static getCameraPoseAlongAxis ({ center, radius, axis, scaleFactor }) {

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
