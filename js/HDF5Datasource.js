import * as THREE from 'three'
import DataSourceBase from './dataSourceBase.js'
import SpacewalkEventBus from './spacewalkEventBus.js'
import {hideGlobalSpinner, showGlobalSpinner} from "./utils";

class HDF5Datasource extends DataSourceBase {

    constructor() {
        super()
        this.isPointCloud = false
        this.currentGenomicExtentList = undefined
    }

    async initialize(hdf5) {

        this.hdf5 = hdf5

        const scratch = await hdf5.keys

        // discard unused keys
        scratch.shift() // Header

        this.replicaKeys = scratch

        // this.replicaKeys = await getReplicaKeys(hdf5)

        await this.updateWithReplicaKey(this.replicaKeys[ 0 ])

        SpacewalkEventBus.globalBus.post({ type: 'DidLoadHDF5File', data: this.replicaKeys })

    }

    // DEPRICATED - 17 Feb 2024
    async _initialize(hdf5) {

        this.hdf5 = hdf5

        this.replicaKeys = await getReplicaKeys(hdf5)

        await this.updateWithReplicaKey(this.replicaKeys[ 0 ])

        SpacewalkEventBus.globalBus.post({ type: 'DidLoadHDF5File', data: this.replicaKeys })

    }

    async updateWithReplicaKey(replicaKey) {

        showGlobalSpinner()

        const str = `HDF5 Datasource - update with replica key ${ replicaKey }`
        console.time(str)

        this.currentReplicaKey = replicaKey

        this.vertexListCount = undefined

        const group = await this.hdf5.get( this.currentReplicaKey )

        this.locus = await getLocus(this.currentReplicaKey, group)

        console.timeEnd(str)

        hideGlobalSpinner()

    }

    async getVertexListCount(){

        if (undefined === this.vertexListCount) {
            const group = await this.hdf5.get( `${ this.currentReplicaKey }/spatial_position` )
            const list = await group.keys
            this.vertexListCount = list.length
        }

        return this.vertexListCount
    }

    getGenomicExtentListWithIndex(ignore) {
        return this.currentGenomicExtentList
    }

    getGenomicExtentWithIndex(index) {
        const genomicExtentList = this.getGenomicExtentListWithIndex(index)
        return { genomicStart: genomicExtentList[ 0 ].startBP, genomicEnd: genomicExtentList[ genomicExtentList.length - 1 ].endBP }
    }

    async createTrace(i) {

        const xyzDataset = await this.hdf5.get( `${ this.currentReplicaKey }/spatial_position/${ 1 + i }` )
        const numbers = await xyzDataset.value

        const bpDataset = await this.hdf5.get(`${ this.currentReplicaKey }/genomic_position`)
        this.currentGenomicExtentList = await getGenomicExtentList(bpDataset)

        let j = 0
        const trace = []
        for (let v = 0; v < numbers.length; v += 3) {

            const [ x, y, z ] = numbers.slice(v, v + 3)

            const object =
                {
                    interpolant: this.currentGenomicExtentList[ j ].interpolant,
                    xyz: { x, y, z },
                    drawUsage: THREE.StaticDrawUsage
                }

            trace.push(object)

            ++j
        }

        return trace

    }

    getLiveContactFrequencyMapVertexLists() {
        console.warn('HDF5Version2Dataset.getLiveContactFrequencyMapVertexLists() NOT IMPLEMENTED')
        return undefined
    }

}

async function getReplicaKeys(hdf5) {

    const scratch = await hdf5.keys

    // discard unused keys
    scratch.shift() // Header
    scratch.shift() // _index

    const compare = (a, b) => {

        // [ replica chr? ]
        const [ replica_a, chr_a ] = a.split('_')
        const [ replica_b, chr_b ] = b.split('_')

        // remove 'replica'
        const aaa = parseInt(replica_a.substring(7))
        const bbb = parseInt(replica_b.substring(7))

        // remove 'chr'
        const ccc = parseInt(chr_a.substring(3))
        const ddd = parseInt(chr_b.substring(3))

        // return (aaa - bbb || ccc - ddd)
        return (ccc - ddd || aaa - bbb)
    }

    return scratch.sort(compare)

}

async function getVertexListLength(group) {
    const dataset = await group.get('spatial_position/1')
    const floats = await dataset.value
    return floats.length / 3
}

async function getLocus(replicaKey, group) {

    const dataset = await group.get('genomic_position')
    const genomicPositions = await dataset.value

    const genomicStart = parseInt(genomicPositions[ 0 ])
    const genomicEnd = parseInt(genomicPositions[ genomicPositions.length - 1 ])

    const [ ignore, chr ] = replicaKey.split('_')
    return { chr, genomicStart, genomicEnd }

}

async function getGenomicExtentList(dataset) {

    const bigIntegers = await dataset.value
    const integers = bigIntegers.map(bigInt64 => parseInt(bigInt64))

    const genomicExtentList = []
    for (let i = 0; i < integers.length; i += 2) {

        const [ startBP, endBP ] = [ integers[ i ], integers[ 1 + i ] ]

        // lazy assignment to sizeBP
        let sizeBP
        if (undefined === sizeBP) {
            sizeBP = endBP - startBP
        }

        genomicExtentList.push({ startBP, endBP, centroidBP: Math.floor((endBP+startBP)/2), sizeBP: (endBP-startBP) })
    }

    const interpolantStepSize = 1/(genomicExtentList.length)
    for (let i = 0; i < genomicExtentList.length; i++) {
        genomicExtentList[ i ].start = (i * interpolantStepSize)
        genomicExtentList[ i ].interpolant = (i * interpolantStepSize) + interpolantStepSize / 2
        genomicExtentList[ i ].end = ((i + 1) * interpolantStepSize)
    }

    return genomicExtentList
}

export default HDF5Datasource
