import * as THREE from "three"
import {FileUtils} from "igv-utils"
import { includes } from "./math.js"
import {hideGlobalSpinner, showGlobalSpinner} from "./utils.js"
import Parser from './parser.js'
import Datasource from './datasource.js'
import SWBDatasource from "./SWBDatasource.js"
import CNDBParser from "./CNDBParser.js"
import CNDBDatasource from "./CNDBDatasource.js"
import {ensembleManager} from "./app"

class EnsembleManager {

    constructor () {
    }

    async loadURL(url, traceKey) {

        const extension = FileUtils.getExtension(url)
        const swbSet = new Set(['swb', 'sw'])
        if (swbSet.has(extension)) {
            const datasource = new SWBDatasource()
            await this.load(url, datasource, datasource, parseInt(traceKey))
        } else if ('cndb' === extension) {
            await this.load(url, new CNDBParser(), new CNDBDatasource(), parseInt(traceKey))
        } else if ('swt' === extension) {
            await this.load(url, new Parser(), new Datasource(), parseInt(traceKey))
        }

    }

    async loadEnsembleGroup(ensembleGroupKey) {
        await this.datasource.updateWithEnsembleGroupKey(ensembleGroupKey)
        this.locus = this.datasource.locus
        this.currentIndex = 0
        this.currentTrace = await this.createTrace(this.currentIndex)
    }

    async load(fileOrPath, parser, datasource, index) {

        showGlobalSpinner()
        const { sample, genomeAssembly } = await parser.parse(fileOrPath, datasource)
        hideGlobalSpinner()

        this.sample = sample

        this.genomeAssembly = genomeAssembly

        this.datasource = datasource

        const { locus, isPointCloud } = datasource

        this.locus = locus

        this.isPointCloud = isPointCloud

        const initialIndex = index || 0
        this.currentTrace = await this.createTrace(initialIndex)
        this.currentIndex = initialIndex

    }

    createEventBusPayload() {

        const { genomicStart, genomicEnd } = this.datasource.getGenomicExtentWithIndex(this.currentIndex)

        const payload =
            {
                sample: this.sample,
                genomeAssembly: this.genomeAssembly,
                chr: this.locus.chr,
                genomicStart,
                genomicEnd,
                genomicExtentList : this.getCurrentGenomicExtentList(),
                initialIndex: this.currentIndex,
                trace: this.currentTrace
            };

        return payload
    }

    async createTrace(i) {
        return await this.datasource.createTrace(i)
    }

    async getTraceCount() {
        return await this.datasource.getVertexListCount()
    }

    getCurrentGenomicExtentList() {
        return this.datasource.currentGenomicExtentList
    }

    getGenomicInterpolantWindowList(interpolantList) {

        const interpolantWindowList = [];

        const genomicExtentList = this.getCurrentGenomicExtentList()

        for (const genomicExtent of genomicExtentList) {

            let { start:a, end:b } = genomicExtent

            for (const interpolant of interpolantList) {
                if ( includes({ a, b, value: interpolant }) ) {
                    interpolantWindowList.push({ genomicExtent, index: genomicExtentList.indexOf(genomicExtent) })
                }
            }
        }

        return 0 === interpolantWindowList.length ? undefined : interpolantWindowList;
    }

    getLiveMapTraceLength() {
        if (this.datasource instanceof SWBDatasource && true === this.isPointCloud) {
            return this.datasource.globaleGenomicExtentList.length
        } else {
            return this.currentTrace.length
        }
    }

    getLiveMapVertexLists() {
        return this.datasource.getLiveMapVertexLists()
    }

    getLiveMapTraceVertices(trace) {

        if (this.datasource instanceof SWBDatasource && true === this.isPointCloud) {
            return this.datasource.getLiveMapTraceVertices(trace)
        } else {
            return trace
                .map(record => {
                    const { x, y, z, isMissingData } = true === this.isPointCloud ? record.centroid : record.xyz
                    return true === isMissingData ? { isMissingData } : { x, y, z }
                })
        }
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
