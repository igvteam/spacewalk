import * as THREE from 'three'
import {openH5File} from 'hdf5-indexed-reader'
import {FileUtils} from 'igv-utils'
import {SpacewalkGlobals} from './app.js'
import DataSourceBase from './dataSourceBase.js'
import {hideGlobalSpinner, showGlobalSpinner} from "./utils";
import {createBoundingBoxWithFlatXYZList} from "./math.js"

class SWBDatasource extends DataSourceBase {

    constructor() {
        super()
        this.currentXYZList = undefined
    }

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

        this.replicaKeys = await getReplicaKeys(hdf5)

        await this.updateWithReplicaKey(this.replicaKeys[ 0 ])

        hideGlobalSpinner()

        return { sample: 'Unspecified Sample', genomeAssembly: (this.header.genome || 'hg19') }
    }

    async updateWithReplicaKey(replicaKey) {

        this.currentReplicaKey = replicaKey

        const genomicPositionGroup = await this.hdf5.get( `${ this.currentReplicaKey }/genomic_position` )
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
            const group = await this.hdf5.get( `${this.currentReplicaKey}/spatial_position` )
            const list = await group.keys
            this.vertexListCount = list.length
        }

        return this.vertexListCount
    }

    async createTrace(i) {

        showGlobalSpinner()

        let str = `createTrace() - retrieve dataset: ${ this.currentReplicaKey }/spatial_position/t_${i}`
        console.time(str)
        const xyzDataset = await this.hdf5.get( `${ this.currentReplicaKey }/spatial_position/t_${i}` )
        const numbers = await xyzDataset.value
        console.timeEnd(str)

        str = `createTrace() - build ${ true === this.isPointCloud ? 'pointcloud' : 'ball & stick' } trace`
        console.time(str)

        let trace
        if (true === this.isPointCloud) {

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
            const regionXYZMatrix = makeNby4(numbers)

            // Convert stacked sub-matrices to a dictionary.
            // key: region-id
            // value: sub-matrix
            const dictionary = splitMatrixByFirstColumnValue(regionXYZMatrix)
            const regionIndexStrings = Object.keys(dictionary).sort((aString, bString) => parseInt(aString, 10) - parseInt(bString, 10))
            this.currentGenomicExtentList = []
            for (const index of regionIndexStrings) {
                this.currentGenomicExtentList.push(this.globaleGenomicExtentList[ index ])
            }

            trace = []
            for (let i = 0; i < this.currentGenomicExtentList.length; i++) {

                const { interpolant } = this.currentGenomicExtentList[ i ]
                const key = regionIndexStrings[ i ]
                const xyz = dictionary[ key ]
                const { centroid } = createBoundingBoxWithFlatXYZList(xyz)

                const hash =
                    {
                        interpolant,
                        xyz,
                        centroid,
                        drawUsage: THREE.DynamicDrawUsage
                    };

                trace.push(hash)
            }

        } else {
            this.currentXYZList = createCleanFlatXYZList(numbers)

            this.currentGenomicExtentList = this.globaleGenomicExtentList

            trace = []
            let j = 0
            for (const xyz of this.currentXYZList) {

                const object =
                    {
                        interpolant: this.currentGenomicExtentList[ j ].interpolant,
                        xyz,
                        drawUsage: THREE.StaticDrawUsage
                    }

                trace.push(object)

                ++j
            }

        }
        console.timeEnd(str)

        hideGlobalSpinner()

        return trace

    }

    getLiveContactFrequencyMapVertexLists() {

        if (this.isPointCloud) {
            return undefined
        } else {
            return this.currentXYZList
        }

    }

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

async function getReplicaKeys(hdf5) {

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
