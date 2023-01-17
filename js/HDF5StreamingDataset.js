import * as THREE from 'three'
import Dataset from './dataset.js'
import {colorRampMaterialProvider} from './app.js'

class HDF5Dataset extends Dataset {

    constructor() {
        super()
        this.isPointCloud = false
    }

    async initialize(hdf5) {

        this.hdf5 = hdf5

        this.key = 'replica10_chr1'

        const gotten = await this.hdf5.get( this.key )

        this.vertexCount = await getVertexListLength(gotten)

        this.locus = await getLocus(this.key, gotten)

        const result = await hdf5.get(`${ this.key }/genomic_position`)
        this.genomicExtentList = await getGenomicExtentList(result)

    }

    async getVertexListCount(){
        const result = await this.hdf5.get( `${ this.key }/spatial_position` )
        const list = await result.keys
        return list.length
    }

    async createTrace(i) {

        const result = await this.hdf5.get( `${ this.key }/spatial_position/${ 1 + i }` )
        const numbers = await result.value
        let j = 0
        const trace = []
        for (let v = 0; v < numbers.length; v += 3) {

            // const [ x, y, z ] = Array.from(numbers.subarray(v, v + 3))
            const [ x, y, z ] = numbers.slice(v, v + 3)

            const color = colorRampMaterialProvider.colorForInterpolant(this.genomicExtentList[ j ].interpolant)

            const object =
                {
                    interpolant: this.genomicExtentList[ j ].interpolant,
                    xyz: { x, y, z },
                    color,
                    rgb: color,
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

async function getVertexListLength(chain) {
    const result = await chain.get('spatial_position/1')
    const vertices = await result.value
    return vertices.length / 3
}

async function getLocus(key, chain) {

    const lut =
        {
            replica10_chr1: 'chr1'
        };

    const result = await chain.get('genomic_position')
    const list = await result.value

    const genomicPositions = Array.from(list)
    const genomicStart = parseInt(genomicPositions[ 0 ])
    const genomicEnd = parseInt(genomicPositions[ genomicPositions.length - 1 ])

    return { chr: lut[ key ], genomicStart, genomicEnd }

}

async function getGenomicExtentList(genomicPositions) {

    const list = await genomicPositions.value
    const ints = Array.from(list).map(bigInt64 => parseInt(bigInt64))

    const genomicExtentList = []
    for (let i = 0; i < ints.length; i += 2) {

        const [ startBP, endBP ] = [ ints[ i ], ints[ 1 + i ] ]

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

export default HDF5Dataset
