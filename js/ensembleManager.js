import * as THREE from "three";
import SpacewalkEventBus from './spacewalkEventBus.js'
import {colorRampMaterialProvider} from "./app.js";
import { includes, degrees } from "./math.js";
import {hideGlobalSpinner, showGlobalSpinner} from "./utils.js";

class EnsembleManager {

    constructor () {
    }

    async load(fileOrPath, parser, genomicDataset, initialIndex) {

        const string = await parser.load(fileOrPath)

        showGlobalSpinner();
        const { sample, genomeAssembly } = parser.parse(string, genomicDataset)
        hideGlobalSpinner();

        const { locus, traceLength, genomicExtentList, isPointCloud } = genomicDataset

        this.initialize(sample, genomeAssembly, locus, traceLength, genomicDataset, genomicExtentList, isPointCloud, initialIndex)

    }

    initialize(sample, genomeAssembly, locus, traceLength, genomicDataset, genomicExtentList, isPointCloud, index) {

        this.genomeAssembly = genomeAssembly

        this.locus = locus

        this.traceLength = traceLength

        this.genomicDataset = genomicDataset

        this.genomicExtentList = genomicExtentList

        this.isPointCloud = isPointCloud

        // this.createEnsemble()

        const thisIsATest = this.getLiveContactFrequencyMapVertexLists()

        const initialIndex = index || 0
        // this.currentTrace = this.ensemble[ initialIndex ]
        this.currentTrace = this.createTrace(initialIndex)
        this.currentIndex = initialIndex

        const { chr, genomicStart, genomicEnd } = locus
        SpacewalkEventBus.globalBus.post({ type: "DidLoadEnsembleFile", data: { sample, genomeAssembly, chr, genomicStart, genomicEnd, initialIndex, trace: this.currentTrace } });

    }

    createEnsemble() {

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

        const values = Object.values(this.genomicDataset.traces)

        const rows = Object.values(values[ i ])

        return rows.map((row, index) => {

            const color = colorRampMaterialProvider.colorForInterpolant(this.genomicExtentList[index].interpolant)

            const xyz = true === this.isPointCloud ? row.flatMap(({x, y, z}) => [x, y, z]) : row
            const rgb = true === this.isPointCloud ? row.flatMap(ignore => [color.r, color.g, color.b]) : color
            const drawUsage = true === this.isPointCloud ? THREE.DynamicDrawUsage : THREE.StaticDrawUsage

            return {
                    interpolant: this.genomicExtentList[index].interpolant,
                    xyz,
                    rgb,
                    color,
                    drawUsage
                }

        })

    }

    getTraceCount() {
        return Object.values(this.genomicDataset.traces).length
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
        const traces = Object.values(this.genomicDataset.traces)
        return traces.map(trace => EnsembleManager.getLiveContactFrequencyMapDatasetVertices(trace))
    }

    static getLiveContactFrequencyMapDatasetVertices(trace) {

        return Object.values(trace)
            .map(row => {
                const { x, y, z, isMissingData } = row
                return true === isMissingData ? { isMissingData } : { x, y, z }
            })

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
