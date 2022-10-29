import * as THREE from "three"
import SpacewalkEventBus from './spacewalkEventBus.js'
import { includes } from "./math.js"
import {hideGlobalSpinner, showGlobalSpinner} from "./utils.js"

class EnsembleManager {

    constructor () {
    }

    async load(fileOrPath, parser, genomicDataset, initialIndex) {

        showGlobalSpinner()
        const { sample, genomeAssembly } = await parser.parse(fileOrPath, genomicDataset)
        hideGlobalSpinner()

        const { locus, genomicExtentList, isPointCloud } = genomicDataset

        this.initialize(sample, genomeAssembly, locus, genomicDataset, genomicExtentList, isPointCloud, initialIndex)

    }

    initialize(sample, genomeAssembly, locus, genomicDataset, genomicExtentList, isPointCloud, index) {

        this.genomeAssembly = genomeAssembly

        this.locus = locus

        this.genomicDataset = genomicDataset

        this.genomicExtentList = genomicExtentList

        this.isPointCloud = isPointCloud

        const initialIndex = index || 0
        this.currentTrace = this.genomicDataset.createTrace(initialIndex)
        this.currentIndex = initialIndex

        const { chr, genomicStart, genomicEnd } = locus
        SpacewalkEventBus.globalBus.post({ type: "DidLoadEnsembleFile", data: { sample, genomeAssembly, chr, genomicStart, genomicEnd, initialIndex, trace: this.currentTrace } });

    }

    DEPRICATED_createEnsemble() {

        const str = 'EnsembleManager - createEnsemble'
        console.time(str)

        this.ensemble = []
        const values = Object.values(this.genomicDataset.traces)
        for (let i = 0; i < values.length; i++) {
            const trace = this.createTrace(i)
            this.ensemble.push(trace)
        }

        console.timeEnd(str)

    }

    createTrace(i) {
        return this.genomicDataset.createTrace(i)
    }

    getTraceLength() {
        return this.genomicDataset.traceLength
    }

    getTraceCount() {
        return this.genomicDataset.getTraceCount()
    }

    getGenomicInterpolantWindowList(interpolantList) {

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

    getLiveContactFrequencyMapVertexLists() {
        return this.genomicDataset.getLiveContactFrequencyMapVertexLists()
    }

    static getLiveContactFrequencyMapTraceVertices(trace) {

        return trace
            .map(({ xyz }) => {
                const { x, y, z, isMissingData } = xyz
                return true === isMissingData ? { isMissingData } : { x, y, z }
            })

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

}

export default EnsembleManager
