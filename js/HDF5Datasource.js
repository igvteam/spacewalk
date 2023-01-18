import * as THREE from 'three'
import DataSource from './dataSource.js'
import {colorRampMaterialProvider} from './app.js'

class HDF5Datasource extends DataSource {

    constructor() {
        super()
        this.isPointCloud = false
    }

    async initialize(hdf5) {

        this.hdf5 = hdf5

        this.key = 'replica10_chr1'

        const group = await this.hdf5.get( this.key )

        this.vertexCount = await getVertexListLength(group)

        this.locus = await getLocus(this.key, group)

        const dataset = await hdf5.get(`${ this.key }/genomic_position`)
        this.genomicExtentList = await getGenomicExtentList(dataset)

    }

    async getVertexListCount(){
        const group = await this.hdf5.get( `${ this.key }/spatial_position` )
        const list = await group.keys
        return list.length
    }

    async createTrace(i) {

        const dataset = await this.hdf5.get( `${ this.key }/spatial_position/${ 1 + i }` )
        const numbers = await dataset.value
        let j = 0
        const trace = []
        for (let v = 0; v < numbers.length; v += 3) {

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

async function getVertexListLength(group) {
    const dataset = await group.get('spatial_position/1')
    const floats = await dataset.value
    return floats.length / 3
}

async function getLocus(key, group) {

    const lut =
        {
            replica10_chr1: 'chr1'
        };

    const dataset = await group.get('genomic_position')
    const genomicPositions = await dataset.value

    const genomicStart = parseInt(genomicPositions[ 0 ])
    const genomicEnd = parseInt(genomicPositions[ genomicPositions.length - 1 ])

    return { chr: lut[ key ], genomicStart, genomicEnd }

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
