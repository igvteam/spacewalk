import SpacewalkEventBus from './spacewalkEventBus.js'
import * as THREE from "three";
import Parser from "./parser.js";
import { colorRampMaterialProvider } from "./app.js";
import { includes, degrees } from "./math.js";

class EnsembleManager {

    constructor () {
    }

    ingest({ sample, genomeAssembly, genomic }, traceKey) {

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

        let { traces } = genomic;

        this.genomeAssembly = genomeAssembly;

        this.locus = genomic.getLocus();
        let { chr, genomicStart, genomicEnd } = this.locus;

        this.maximumSegmentID = genomic.maximumSegmentID;
        this.isPointCloud = genomic.isPointCloud;

        for (let [k, trace] of Object.entries(traces)) {

            const parts = k.split('%');
            const ensembleKey = parts.pop();
            this.ensemble[ensembleKey] = [];

            const keyValuePairs = Object.entries(trace);
            for (let keyValuePair of keyValuePairs) {

                let [ key, value ] = keyValuePair;

                let { startBP, centroidBP, endBP, sizeBP } = Parser.genomicRangeFromHashKey(key);

                const xyzList = this.isPointCloud ? value : [ { x: value.x, y: value.y, z: value.z } ];

                const positions = xyzList.filter(({ x, y, z }) => ![ x, y, z ].some(isNaN));

                if (positions.length > 0) {

                    const geometry = new THREE.BufferGeometry();

                    const xyz = positions.flatMap(({ x, y, z }) => [ parseFloat(x), parseFloat(y), parseFloat(z)])
                    geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( xyz, 3 ) );

                    const interpolant = (centroidBP - genomicStart) / (genomicEnd - genomicStart);

                    geometry.userData.color = colorRampMaterialProvider.colorForInterpolant(interpolant);

                    const rgb = positions.flatMap(ignore => [ geometry.userData.color.r, geometry.userData.color.g, geometry.userData.color.b ])
                    const attribute = new THREE.Float32BufferAttribute(rgb, 3);
                    attribute.setUsage( true === this.isPointCloud ? THREE.DynamicDrawUsage : THREE.StaticDrawUsage );
                    geometry.setAttribute('color', attribute );

                    let colorRampInterpolantWindow =
                        {
                            start: (startBP - genomicStart) / (genomicEnd - genomicStart),
                            end: (endBP - genomicStart) / (genomicEnd - genomicStart),
                            interpolant,
                            sizeBP,
                            genomicLocation: centroidBP,
                            segmentIndex: keyValuePairs.indexOf(keyValuePair)
                        };

                    this.ensemble[ ensembleKey ].push( { colorRampInterpolantWindow, geometry } );

                }

            }

        }

        console.timeEnd(str);

        const initialKey = traceKey || '0';
        this.currentTrace = this.getTraceWithName(initialKey);
        SpacewalkEventBus.globalBus.post({ type: "DidLoadEnsembleFile", data: { sample, genomeAssembly, chr, genomicStart, genomicEnd, initialKey, ensemble: this.ensemble, trace: this.currentTrace } });

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
