import * as THREE from "three";
import SpacewalkEventBus from './spacewalkEventBus.js'
import {colorRampMaterialProvider, ensembleManager} from "./app.js";
import { includes, degrees } from "./math.js";

class EnsembleManager {

    constructor () {
    }

    ingest(sample, genomeAssembly, genomic, index) {

        this.genomeAssembly = genomeAssembly

        this.genomic = genomic

        this.ensemble = {}

        const str = 'EnsembleManager ingestSW'
        console.time(str)

        const traceList = genomic.getTraceList()
        this.ensemble = traceList.map(( trace, index) => this.createTrace(genomic, traceList[ index ]))

        console.timeEnd(str);

        const initialIndex = index || 0

        this.currentTrace = this.ensemble[ initialIndex ]

        const { chr, genomicStart, genomicEnd } = this.genomic.locus
        SpacewalkEventBus.globalBus.post({ type: "DidLoadEnsembleFile", data: { sample, genomeAssembly, chr, genomicStart, genomicEnd, initialIndex, trace: this.currentTrace } });

    }

    createTrace(genomic, trace) {

        return genomic.getTraceRowXYZList(trace).map((traceRowXYZ, index) => {

            const color = colorRampMaterialProvider.colorForInterpolant(genomic.genomicExtentList[index].interpolant)

            const xyz = true === this.genomic.isPointCloud ? traceRowXYZ.flatMap(({x, y, z}) => [x, y, z]) : traceRowXYZ
            const rgb = true === this.genomic.isPointCloud ? traceRowXYZ.flatMap(ignore => [color.r, color.g, color.b]) : color
            const drawUsage = true === this.genomic.isPointCloud ? THREE.DynamicDrawUsage : THREE.StaticDrawUsage

            return {
                    interpolant: genomic.genomicExtentList[index].interpolant,
                    xyz,
                    rgb,
                    color,
                    drawUsage
                }

        })

    }

    getTraceKey(trace) {
        const index = this.ensemble.indexOf(trace)
        return index.toString()
    }

    getTraceCount() {
        const list = Object.keys(this.genomic.traces)
        return list.length
    }

    getGenomicInterpolantWindowList(interpolantList) {

        const interpolantWindowList = [];

        for (let genomicExtent of this.genomic.genomicExtentList) {

            let { start:a, end:b } = genomicExtent

            for (let interpolant of interpolantList) {

                if ( includes({ a, b, value: interpolant }) ) {
                    interpolantWindowList.push({ genomicExtent, index: this.genomic.genomicExtentList.indexOf(genomicExtent) })
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

    static getSingleCentroidVertices(trace, doFilterMissingData) {

        let list
        if (true === doFilterMissingData) {
            list = trace.filter(({ xyz }) => undefined === xyz.isMissingData)
        } else {
            list = trace
        }

        return list.map(({ xyz }) => new THREE.Vector3(xyz.x, xyz.y, xyz.z))

    }

    static getLiveMapVertices(trace) {

        return trace
            .map(({ xyz }) => {
                const { x, y, z, isMissingData } = xyz
                return true === isMissingData ? { isMissingData } : { x, y, z }
            })

    }

}

export default EnsembleManager
