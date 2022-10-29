import * as THREE from 'three'
import Dataset from './dataset.js'
import {colorRampMaterialProvider} from './app.js'

const scaleFactor = 165
class HDF5Dataset extends Dataset {

    constructor() {
        super()
        this.isPointCloud = false
    }

    initialize(hdf5) {

        this.hdf5 = hdf5

        this.indices = hdf5.keys()
            .map(str => parseInt(str))
            .sort((a, b) => a - b)

        const index = this.indices[ 0 ]
        const vertices = hdf5.get(index.toString()).value

        // this.xyzList = []
        // for (let i = 0; i < vertices.length; i += 3) {
        //     const xyz = Array.from(vertices.subarray(i, i + 3), x => scaleFactor * x)
        //     this.xyzList.push(xyz)
        // }

        this.traceLength = vertices.length / 3

        this.genomicStart = 18e6
        this.genomicEnd   = 19.95e6

        this.locus = { chr: 'chr21', genomicStart: this.genomicStart, genomicEnd: this.genomicEnd }

        this.genomicExtentList = createGenomicExtentList(this.genomicStart, this.genomicEnd, this.traceLength)

    }

    getTraceCount(){
        return this.indices.length
    }

    createTrace(i) {

        const index = this.indices[ i ]
        const key = index.toString()
        const thang = this.hdf5.get(key)
        const vertices = thang.value

        const trace = []
        let j = 0
        for (let v = 0; v < vertices.length; v += 3) {

            const [ x, y, z ] = Array.from(vertices.subarray(v, v + 3), x => scaleFactor * x)

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

}

function createGenomicExtentList(genomicStart, genomicEnd, traceLength) {

    const list = []

    const stepSize = (genomicEnd - genomicStart) / traceLength

    for (let s = 0; s < traceLength; s++) {

        const startBP = Math.floor(genomicStart + s * stepSize)
        const endBP = Math.ceil(startBP + stepSize)
        const centroidBP = Math.floor((startBP + endBP)/2)

        list.push({ startBP, endBP, centroidBP, sizeBP: stepSize })
    }

    for (let i = 0; i < list.length; i++) {
        const item = list[ i ]
        item.interpolant = (item.centroidBP - genomicStart) / (genomicEnd - genomicStart)
        item.start  = (item.startBP - genomicStart) / (genomicEnd - genomicStart)
        item.end    = (item.endBP   - genomicStart) / (genomicEnd - genomicStart)
    }


    return list
}

export default HDF5Dataset
