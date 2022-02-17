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
        this.genomicExtentList = genomic.genomicExtentList

        for (let [ key, trace ] of Object.entries(genomic.traces)) {

            const [ ignore, ensembleKey ] = key.split('%')
            this.ensemble[ ensembleKey ] = []

            const traceValues = Object.values(trace)
            for (let i = 0; i < traceValues.length; i++) {

                const xyzList = this.isPointCloud ? traceValues[ i ] : [ traceValues[ i ] ]

                const xyz = xyzList.flatMap(({ x, y, z }) => [ x, y, z ])

                const color = colorRampMaterialProvider.colorForInterpolant(this.genomicExtentList[ i ].interpolant)

                const rgb = xyzList.flatMap(ignore => [ color.r, color.g, color.b ])

                const trace =
                    {
                        // for a ball & stick trace - single xyz per genomic range - these are arrays of length one (1)
                        // for a pointcloud tracd - multiple xyz per genomic range - these are arrays of length N > 1
                        xyz,

                        // interpolated color ramp color for this genomic range
                        color,

                        rgb,

                        drawUsage: true === this.isPointCloud ? THREE.DynamicDrawUsage : THREE.StaticDrawUsage,
                    }

                this.ensemble[ ensembleKey ].push(trace)

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

    getInterpolantWindowList(interpolantList) {

        const interpolantWindowList = [];

        for (let genomicExtent of this.genomicExtentList) {

            let { start:a, end:b } = genomicExtent

            for (let interpolant of interpolantList) {

                if ( includes({ a, b, value: interpolant }) ) {
                    interpolantWindowList.push({ genomicExtent, index: this.genomicExtentList.indexOf(genomicExtent) })
                }

            }

        }

        return 0 === interpolantWindowList.length ? undefined : interpolantWindowList;
    }

    static getTraceBounds(trace){

        const boundingBox = new THREE.Box3()

        const probe = new THREE.Vector3()
        for (let { xyz } of trace) {
            const [ x, y, z ] = xyz
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

    return trace.map(({ xyz }) => {
        const [ x, y, z ] = xyz
        return new THREE.Vector3(x, y, z)
    })

}

export { getSingleCentroidVertices }
export default EnsembleManager;
