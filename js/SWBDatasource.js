import * as THREE from 'three'
import {openH5File} from 'hdf5-indexed-reader'
import {FileUtils} from 'igv-utils'
import {SpacewalkGlobals} from './app.js'
import DataSourceBase from './dataSourceBase.js'
import {hideGlobalSpinner, showGlobalSpinner} from "./utils";
import {createBoundingBoxWithFlatXYZList} from "./math.js"
import SpacewalkEventBus from "./spacewalkEventBus"
import igv from "igv"

class SWBDatasource extends DataSourceBase {

    async parse(path, datasource) {

        SpacewalkGlobals.url = false === FileUtils.isFilePath(path) ? path : undefined

        const hdf5 = await openH5File(FileUtils.isFilePath(path) ? { file:path } : { url: path })

        const { sample, genomeAssembly } = await datasource.initialize(hdf5)

        return { sample, genomeAssembly }

    }

    async initialize(hdf5) {

        showGlobalSpinner()

        this.hdf5 = hdf5
        const headerGroup = await hdf5.get('/Header')
        this.header = await headerGroup.attrs

        this.ensembleGroupKeys = await getEnsembleGroupKeys(hdf5)

        await this.updateWithEnsembleGroupKey(this.ensembleGroupKeys[0])

        hideGlobalSpinner()


        // Update the ensemble group select list with list of ensemble group keys, if more than one.
        if (this.ensembleGroupKeys.length > 1) {
            SpacewalkEventBus.globalBus.post({ type: 'DidLoadSWBEnsembleGroup', data: this.ensembleGroupKeys })
        }

        let genomeAssembly
        const a = undefined === this.header.genome
        const b = undefined === igv.GenomeUtils.KNOWN_GENOMES[ this.header.genome ]
        if (a || b) {
            console.warn(`Warning: Unrecognized genome ${ this.header.genome || 'undefined' }`)
            genomeAssembly = 'hg19'
        } else {
            genomeAssembly = this.header.genome
        }


        return { sample: 'Unspecified Sample', genomeAssembly }
    }

    async updateWithEnsembleGroupKey(ensembleGroupKey) {

        this.currentEnsembleGroupKey = ensembleGroupKey

        const genomicPositionGroup = await this.hdf5.get( `${ this.currentEnsembleGroupKey }/genomic_position` )
        const dataset = await genomicPositionGroup.get('regions')
        const { chromosome, genomicExtentList } = await getGlobalGenomicExtentList(dataset)
        this.locus =
            {
                chr:chromosome,
                genomicStart:genomicExtentList[0].startBP,
                genomicEnd:genomicExtentList[genomicExtentList.length-1].endBP
            }

        console.log(`SWBDatasource - chromosome ${ this.locus.chr }`)

        this.globaleGenomicExtentList = genomicExtentList

        this.isPointCloud = ('multi_point' === this.header.point_type)
        this.vertexListCount = undefined

    }

    async getVertexListCount(){

        if (undefined === this.vertexListCount) {
            const group = await this.hdf5.get( `${this.currentEnsembleGroupKey}/spatial_position` )
            const list = await group.keys
            this.vertexListCount = list.length
        }

        return this.vertexListCount
    }

    async createTrace(i) {

        showGlobalSpinner()

        let str = `createTrace() - retrieve dataset: ${ this.currentEnsembleGroupKey }/spatial_position/t_${i}`
        console.time(str)
        const xyzDataset = await this.hdf5.get( `${ this.currentEnsembleGroupKey }/spatial_position/t_${i}` )
        const numbers = await xyzDataset.value
        console.timeEnd(str)

        str = `createTrace() - build ${ true === this.isPointCloud ? 'pointcloud' : 'ball & stick' } trace`
        console.time(str)

        let trace
        if (true === this.isPointCloud) {

            const { genomicExtentList, dictionary, regionIndexStrings } = createGenomicExtentList(numbers, this.globaleGenomicExtentList)

            this.currentGenomicExtentList = genomicExtentList

            trace = genomicExtentList.map((genomicExtent, index) => getTracePayload(index, genomicExtent, regionIndexStrings, dictionary))
        } else {

            this.currentGenomicExtentList = this.globaleGenomicExtentList

            const xyzList = createCleanFlatXYZList(numbers)

            trace = xyzList.map((xyz, index) => {
                const { interpolant } = this.currentGenomicExtentList[ index ]
                return { interpolant, xyz, drawUsage: THREE.StaticDrawUsage}
            })

        }
        console.timeEnd(str)

        hideGlobalSpinner()

        return trace

    }

    getLiveContactFrequencyMapVertexLists() {

        if (true === this.isPointCloud) {

        } else {

            // TODO: This is incredibly slow ...
            const result = [];

            (async () => {
                try {
                    for (let i = 0; i < this.vertexListCount; i++) {
                        console.log(`SWDatasource: Harvest vertices at index ${i}`)
                        const xyzDataset = await this.hdf5.get( `${ this.currentEnsembleGroupKey }/spatial_position/t_${i}` )
                        const numbers = await xyzDataset.value
                        result.push(createCleanFlatXYZList(numbers))
                    }

                    SpacewalkEventBus.globalBus.post({ type: 'DidCreateSWBLiveContactMapVertices', data: result })

                } catch (error) {
                    console.error('What the heck?', error)
                }
            })()

        }



    }

}

function getTracePayload(i, genomicExtent, regionIndexStrings, dictionary) {

    const { interpolant } = genomicExtent
    const key = regionIndexStrings[ i ]
    const xyz = dictionary[ key ]
    const { centroid } = createBoundingBoxWithFlatXYZList(xyz)

    return { interpolant, xyz, centroid, drawUsage: THREE.DynamicDrawUsage }

}

function createGenomicExtentList(xyzDatasetNumbers, globalGenomicExtentList) {

    const makeNby4 = flatArray => {

        const nby4 = []
        for (let i = 0; i < flatArray.length; i += 4) {
            let row = flatArray.slice(i, i + 4);
            nby4.push(row);
        }

        return nby4
    }

    // Convert flat (one-dimensional array) to two-dimensional matrix. Each row is: region-id | x | y | z
    // The result is a stack of sub-matrices each corresponding to a region-id
    const regionXYZMatrix = makeNby4(xyzDatasetNumbers)

    // Convert stacked sub-matrices to a dictionary.
    // key: region-id
    // value: sub-matrix
    const dictionary = splitMatrixByFirstColumnValue(regionXYZMatrix)
    const regionIndexStrings = Object.keys(dictionary).sort((aString, bString) => parseInt(aString, 10) - parseInt(bString, 10))
    const genomicExtentList = []
    for (const index of regionIndexStrings) {
        genomicExtentList.push(globalGenomicExtentList[ index ])
    }

    return { genomicExtentList, dictionary, regionIndexStrings }
}

function splitMatrixByFirstColumnValue(matrix) {
    const subMatrixDictionary = {}
    let currentSubMatrix = [];
    let currentValue = matrix[0][0];

    for (let row of matrix) {
        if (row[0] === currentValue) {
            currentSubMatrix.push(row);
        } else {
            subMatrixDictionary[currentValue.toString()] = currentSubMatrix;
            currentSubMatrix = [row];
            currentValue = row[0];
        }
    }
    // Push the last group
    subMatrixDictionary[currentValue.toString()] = currentSubMatrix;

    // discard first column
    for (let matrix of Object.values(subMatrixDictionary)) {
        matrix.map(row => row.shift())
    }

    // flatten matrices into one-dimensional array
    for (const [ key, value ] of Object.entries(subMatrixDictionary)) {
        subMatrixDictionary[key] = value.flat()
    }

    return subMatrixDictionary
}

async function getGlobalGenomicExtentList(dataset) {

    const strings = await dataset.value

    let chromosome
    const genomicExtentList = []
    for (let i = 0; i < strings.length; i += 3) {
        let [ chr, startBP, endBP ] = strings.slice(i, i + 3)
        if (undefined === chromosome) {
            chromosome = chr
        }
        startBP = parseInt(startBP)
        endBP = parseInt(endBP)
        genomicExtentList.push({ startBP, endBP, centroidBP: Math.floor((endBP+startBP)/2), sizeBP: (endBP-startBP) })
    }

    const interpolantStepSize = 1/(genomicExtentList.length)
    for (let i = 0; i < genomicExtentList.length; i++) {
        genomicExtentList[ i ].start = (i * interpolantStepSize)
        genomicExtentList[ i ].interpolant = (i * interpolantStepSize) + interpolantStepSize / 2
        genomicExtentList[ i ].end = ((i + 1) * interpolantStepSize)
    }

    return { chromosome, genomicExtentList }
}

function createCleanFlatXYZList(numbers) {

    const bbox = createBoundingBoxWithFlatXYZList(numbers)
    const isMissingData = { x: bbox.centroid[ 0 ], y: bbox.centroid[ 1 ], z: bbox.centroid[ 2 ], isMissingData: true }

    const list = []
    for (let v = 0; v < numbers.length; v += 3) {

        const [ x, y, z ] = numbers.slice(v, v + 3)

        if ( [ x, y, z ].some(isNaN) ) {
            // console.warn('is missing xyz value. will replace with centroid')
            list.push(isMissingData)
        } else {
            list.push({ x, y, z, isMissingData: undefined })
        }

    }

    return list
}

async function getEnsembleGroupKeys(hdf5) {

    let scratch = await hdf5.keys

    // discard Header key
    scratch = scratch.filter(item => 'Header' !== item)

    // if present, discard _index key
    if (new Set(scratch).has('_index')) {
        scratch.shift()
    }

    return scratch
}

export default SWBDatasource
