import * as THREE from "three"
import {FileUtils} from "igv-utils"
import { includes } from "./math.js"
import {hideGlobalSpinner, showGlobalSpinner} from "./utils.js"
import {ensembleManager} from './app.js'
import GenomicParser from './genomicParser.js'
import GenomicDataset from './genomicDataset.js'
import HDF5StreamingParser from './HDF5StreamingParser.js'
import HDF5StreamingDataset from './HDF5StreamingDataset.js'

class EnsembleManager {

    constructor () {
    }

    async loadURL(url, traceKey) {

        const extension = FileUtils.getExtension(url)
        if ('cndb' === extension) {
            await ensembleManager.load(url, new HDF5StreamingParser(), new HDF5StreamingDataset(), parseInt(traceKey))
        } else {
            await ensembleManager.load(url, new GenomicParser(), new GenomicDataset(), parseInt(traceKey))
        }

    }

    async load(fileOrPath, parser, genomicDataset, index) {

        showGlobalSpinner()
        const { sample, genomeAssembly } = await parser.parse(fileOrPath, genomicDataset)
        hideGlobalSpinner()

        this.sample = sample

        this.genomeAssembly = genomeAssembly

        this.genomicDataset = genomicDataset

        const { locus, genomicExtentList, isPointCloud } = genomicDataset

        this.locus = locus

        this.genomicExtentList = genomicExtentList

        this.isPointCloud = isPointCloud

        const initialIndex = index || 0
        this.currentTrace = await this.createTrace(initialIndex)
        this.currentIndex = initialIndex

    }

    createEventBusPayload() {

        const { chr, genomicStart, genomicEnd } = this.locus

        const payload =
            {
                sample: this.sample,
                genomeAssembly: this.genomeAssembly,
                chr,
                genomicStart,
                genomicEnd,
                initialIndex: this.currentIndex,
                trace: this.currentTrace
            };

        return payload
    }

    async createTrace(i) {
        return await this.genomicDataset.createTrace(i)
    }

    getTraceLength() {
        return this.genomicDataset.vertexCount
    }

    async getTraceCount() {
        return await this.genomicDataset.getVertexListCount()
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

    static getEnsembleTraceVertices(ensembleTrace) {

        return ensembleTrace
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
