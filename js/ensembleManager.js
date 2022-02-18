import SpacewalkEventBus from './spacewalkEventBus.js'
import * as THREE from "three";
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

                const traceValue = traceValues[ i ]

                const color = colorRampMaterialProvider.colorForInterpolant(this.genomicExtentList[ i ].interpolant)

                let xyz
                let rgb

                if (true === this.isPointCloud) {
                    xyz = traceValue.flatMap(({ x, y, z }) => [ x, y, z ])
                    rgb = traceValue.flatMap(ignore => [ color.r, color.g, color.b ])
                } else {
                    xyz = traceValue
                    rgb = color
                }

                const item =
                    {
                        xyz,
                        rgb,
                        color,
                        drawUsage: true === this.isPointCloud ? THREE.DynamicDrawUsage : THREE.StaticDrawUsage
                    }

                this.ensemble[ ensembleKey ].push(item)

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

            if (Array.isArray(xyz)) {

                for (let i = 0; i < xyz.length; i += 3) {
                    probe.set(xyz[ i ], xyz[ i + 1 ], xyz[ i + 2])
                    boundingBox.expandByPoint(probe)
                }
            } else {
                probe.set(xyz.x, xyz.y, xyz.z)
                boundingBox.expandByPoint(probe)
            }

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

function getSingleCentroidVertices(trace, doFilterMissingData) {

    let list
    if (true === doFilterMissingData) {
        list = trace.filter(({ xyz }) => undefined === xyz.isMissingData)
    } else {
        list = trace
    }

    return list.map(({ xyz }) => new THREE.Vector3(xyz.x, xyz.y, xyz.z))

}

export { getSingleCentroidVertices }
export default EnsembleManager;
