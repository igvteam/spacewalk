import * as THREE from 'three'
import Dataset from './dataset.js'
import {colorRampMaterialProvider} from './app.js'

class HDF5Dataset extends Dataset {

    constructor() {
        super()
        this.isPointCloud = false
    }

    initialize(hdf5) {

        this.hdf5 = hdf5

        this.key = 'replica10_chr1'

        this.vertexCount = getVertexListLength(this.hdf5.get( this.key ))

        this.locus = getLocus(this.key, this.hdf5.get( this.key ))

        this.genomicExtentList = getGenomicExtentList(hdf5.get(`${ this.key }/genomic_position`))

    }

    getVertexListCount(){
        return this.hdf5.get( `${ this.key }/spatial_position` ).keys().length
    }

    createTrace(i) {

        const result = this.hdf5.get( `${ this.key }/spatial_position/${ 1 + i }` )
        const numbers = result.value
        let j = 0
        const trace = []
        for (let v = 0; v < numbers.length; v += 3) {

            const [ x, y, z ] = Array.from(numbers.subarray(v, v + 3))
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

function getVertexListLength(chain) {
    const vertices = chain.get('spatial_position/1').value
    return vertices.length / 3
}

function getLocus(key, chain) {

    const lut =
        {
            C1: 'chr1',
            C2: 'chr2'
        }

    const genomicPositions = Array.from(chain.get('genomic_position').value)
    const genomicStart = parseInt(genomicPositions[ 0 ])
    const genomicEnd = parseInt(genomicPositions[ genomicPositions.length - 1 ])

    return { chr: lut[ key ], genomicStart, genomicEnd }

}

function getGenomicExtentList(genomicPositions) {

    const ints = Array.from(genomicPositions.value).map(bigInt64 => parseInt(bigInt64))
    const list = []
    for (let i = 0; i < ints.length; i += 2) {

        const [ startBP, endBP ] = [ ints[ i ], ints[ 1 + i ] ]

        // lazy assignment to sizeBP
        let sizeBP
        if (undefined === sizeBP) {
            sizeBP = endBP - startBP
        }

        list.push({ startBP, endBP, centroidBP: Math.floor((endBP+startBP)/2), sizeBP: (endBP-startBP) })
    }

    const interpolantStepSize = 1/(list.length)
    for (let i = 0; i < list.length; i++) {
        list[ i ].start = (i * interpolantStepSize)
        list[ i ].interpolant = (i * interpolantStepSize) + interpolantStepSize / 2
        list[ i ].end = ((i + 1) * interpolantStepSize)
    }

    return list
}

export default HDF5Dataset
