import SpacewalkEventBus from './spacewalkEventBus.js'
import * as THREE from "three";
import Parser from "./parser.js";
import { colorRampMaterialProvider } from "./app.js";
import { includes, degrees } from "./math.js";

class EnsembleManager {

    constructor () {
    }

    ingest({ sample, genomeAssembly, genomic }, traceKey) {

        const str = 'EnsembleManager ingestSW'
        console.time(str)

        this.locus = genomic.getLocus()
        let { chr, genomicStart, genomicEnd } = this.locus

        // maximumSegmentID is used to size the distance and contact maps which
        // are N by N where N = maximumSegmentID.
        // Because trace data often has missing xyz values the total number of
        // segments cannot be assumed to be the same for each trace in the ensemble.
        // We use  maximumSegmentID to ensure all traces will map to the contact
        // and distance maps.
        this.maximumSegmentID = genomic.maximumSegmentID

        this.isPointCloud = genomic.isPointCloud;

        this.ensemble = {}
        for (let [ tracesKey, trace ] of Object.entries(genomic.traces)) {

            const [ discard, ensembleKey ] = tracesKey.split('%')
            this.ensemble[ ensembleKey ] = []

            const traceKeyValues = Object.entries(trace)
            for (let traceKeyValue of traceKeyValues) {

                let [ genomicRangeKey, pointCloudOrXYZ ] = traceKeyValue

                let { startBP, centroidBP, endBP, sizeBP } = Parser.getGenomicRange(genomicRangeKey)

                const xyzList = this.isPointCloud ? pointCloudOrXYZ : [ pointCloudOrXYZ ];

                const positions = xyzList.filter(({ x, y, z }) => ![ x, y, z ].some(isNaN));

                if (positions.length > 0) {
                    
                    const xyz = positions.flatMap(({ x, y, z }) => [ x, y, z ])

                    const interpolant = (centroidBP - genomicStart) / (genomicEnd - genomicStart)

                    const color = colorRampMaterialProvider.colorForInterpolant(interpolant)
                    const rgb = positions.flatMap(ignore => [ color.r, color.g, color.b ])

                    const colorRampInterpolantWindow =
                        {
                            // genomic data
                            genomicLocation: centroidBP,
                            start: (startBP - genomicStart) / (genomicEnd - genomicStart),
                            end: (endBP - genomicStart) / (genomicEnd - genomicStart),
                            sizeBP,

                            // interpolant along the genomic range
                            interpolant,

                            // an array of length one (1) if this is a single xyz per genomic range trace
                            // of array greater then one for a pointcloud with multiple xyz per genomic rangwe
                            xyz,

                            // color ramp interpoted color for this genomic range
                            color,
                            rgb,

                            drawUsage: true === this.isPointCloud ? THREE.DynamicDrawUsage : THREE.StaticDrawUsage,

                            segmentIndex: traceKeyValues.indexOf(traceKeyValue),
                        }

                    this.ensemble[ ensembleKey ].push( { colorRampInterpolantWindow } )

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

    static getTraceBounds(trace){

        const boundingBox = new THREE.Box3()

        const probe = new THREE.Vector3()
        for (let { colorRampInterpolantWindow } of trace) {
            const [ x, y, z ] = colorRampInterpolantWindow.xyz
            probe.set(x, y, z)
            boundingBox.expandByPoint(probe)
        }

        const { min, max } = boundingBox;

        const boundingSphere = new THREE.Sphere();
        boundingBox.getBoundingSphere(boundingSphere);
        const { center, radius } = boundingSphere;

        return { min, max, center, radius }
    }

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


}

function getSingleCentroidVertices(trace) {

    return trace.map(({ colorRampInterpolantWindow }) => {
        const [ x, y, z ] = colorRampInterpolantWindow.xyz
        return new THREE.Vector3(x, y, z)
    })

}

export { getSingleCentroidVertices }
export default EnsembleManager;
