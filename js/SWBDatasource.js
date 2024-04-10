import * as THREE from 'three'
import DataSourceBase from './dataSourceBase.js'
import {hideGlobalSpinner, showGlobalSpinner} from "./utils";
import {createBoundingBoxWithFlatXYZList} from "./math.js"

class SWBDatasource extends DataSourceBase {

    constructor() {
        super()
        this.currentXYZList = undefined
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

        let list
        if (undefined === this.vertexListCount) {
            if (true === this.isPointCloud) {
                const multiPointGroup = await this.hdf5.get( `${this.currentReplicaKey}/spatial_position/multi_point` )
                list = await multiPointGroup.keys
            } else {
                const singlePointGroup = await this.hdf5.get( `${this.currentReplicaKey}/spatial_position/single_point` )
                list = await singlePointGroup.keys
            }
            this.vertexListCount = list.length
        }

        return this.vertexListCount
    }

    async createTrace(i) {

        const str = `SWBDatasource - createTrace(${i})`
        console.time(str)

        showGlobalSpinner()

        let trace
        if (true === this.isPointCloud) {
            const traceGroup = await this.hdf5.get( `${this.currentReplicaKey}/spatial_position/multi_point/${i}` )

            // The dataset keys are string representations of the index into the currentGenomicExtentList.
            // Use this index to retrieve the genomic extent corresponding to the xyz values in the dataset
            const datasetKeys = await traceGroup.keys
            this.currentGenomicExtentList = []
            for (const key of datasetKeys) {
                this.currentGenomicExtentList.push(this.globaleGenomicExtentList[parseInt(key, 10)])
            }

            trace = []
            for (let i = 0; i < this.currentGenomicExtentList.length; i++) {
                const { interpolant } = this.currentGenomicExtentList[ i ]
                const key = datasetKeys[ i ]
                const xyzDataset = await traceGroup.get(`${ key }`)
                const xyz = await xyzDataset.value

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

            this.currentGenomicExtentList = this.globaleGenomicExtentList

            const xyzDataset = await this.hdf5.get( `${ this.currentReplicaKey }/spatial_position/single_point/${i}` )
            const numbers = await xyzDataset.value
            this.currentXYZList = createCleanFlatXYZList(numbers)

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

        hideGlobalSpinner()
        console.timeEnd(str)

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
