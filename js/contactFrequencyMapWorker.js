import KDBush from './kd3d/kd3d.js'
import { getSingleCentroidVerticesWithTrace } from './webWorkerUtils.js'

self.addEventListener('message', ({ data }) => {

    const str = `Contact Frequency Map Worker - Calculate Frequency Values`
    console.time(str)

    const values = new Float32Array(data.maximumSegmentID * data.maximumSegmentID)
    const essentials = 'trace' === data.traceOrEnsemble ? [ JSON.parse(data.itemsString) ] : JSON.parse(data.essentialsString)
    calculateContactFrequencies(values, data.maximumSegmentID, essentials, data.distanceThreshold)

    console.timeEnd(str)

    const payload =
        {
            traceOrEnsemble: data.traceOrEnsemble,
            workerValuesBuffer: values
        }

    self.postMessage(payload, [ values.buffer ])

}, false)

function calculateContactFrequencies(values, maximumSegmentID, essentials, distanceThreshold) {
    values.fill(0)
    for (let items of essentials) {
        accumulateContactFrequencies(values, maximumSegmentID, items, distanceThreshold)
    }
}

function accumulateContactFrequencies(values, maximumSegmentID, items, distanceThreshold) {

    const exclusionSet = new Set();

    const spatialIndex = new KDBush(kdBushConfiguratorWithTrace(items))

    for (let i = 0; i < items.length; i++) {

        const { x, y, z, segmentIndex:i_segmentIndex } = items[ i ];

        exclusionSet.add(i)
        const xy_diagonal = i_segmentIndex * maximumSegmentID + i_segmentIndex

        values[ xy_diagonal ]++;

        const contact_indices = spatialIndex.within(x, y, z, distanceThreshold).filter(index => !exclusionSet.has(index))

        if (contact_indices.length > 0) {
            for (let j of contact_indices) {

                const { segmentIndex:j_segmentIndex } = items[ j ]

                const xy = i_segmentIndex * maximumSegmentID + j_segmentIndex
                const yx = j_segmentIndex * maximumSegmentID + i_segmentIndex

                if (xy > values.length) {
                    console.log('xy is bogus index ' + xy)
                }

                if (yx > values.length) {
                    console.log('yx is bogus index ' + yx)
                }

                values[ xy ] += 1

                values[ yx ] = values[ xy ]

            }
        }

    }

}

function kdBushConfiguratorWithTrace(vertices) {

    return {
        idList: vertices.map((vertex, index) => index),
        points: vertices,
        getX: pt => pt.x,
        getY: pt => pt.y,
        getZ: pt => pt.z,
        nodeSize: 64,
        ArrayType: Float64Array,
        axisCount: 3
    }

}
