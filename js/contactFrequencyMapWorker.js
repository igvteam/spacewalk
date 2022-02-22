import KDBush from './kd3d/kd3d.js'

self.addEventListener('message', ({ data }) => {

    const str = `Contact Frequency Map Worker - Calculate Frequency Values`
    console.time(str)

    const values = new Float32Array(data.maximumSegmentID * data.maximumSegmentID)
    const vertexLists = 'trace' === data.traceOrEnsemble ? [ JSON.parse(data.verticesString) ] : JSON.parse(data.vertexListsString)
    calculateContactFrequencies(values, data.maximumSegmentID, vertexLists, data.distanceThreshold)

    console.timeEnd(str)

    const payload =
        {
            traceOrEnsemble: data.traceOrEnsemble,
            workerValuesBuffer: values
        }

    self.postMessage(payload, [ values.buffer ])

}, false)

function calculateContactFrequencies(values, maximumSegmentID, vertexLists, distanceThreshold) {
    values.fill(0)
    for (let vertices of vertexLists) {
        accumulateContactFrequencies(values, maximumSegmentID, vertices, distanceThreshold)
    }
}

function accumulateContactFrequencies(values, maximumSegmentID, vertices, distanceThreshold) {

    const exclusionSet = new Set();

    const validVeretices = []
    const validIndices = []

    for (let i = 0; i < vertices.length; i++) {
        if (true === vertices[ i ].isMissingData) {
            // ignore
        } else {
            validIndices.push(i)
            validVeretices.push(vertices[ i ])
        }
    }

    const spatialIndex = new KDBush(kdBushConfiguratorWithTrace(validVeretices))

    for (let v = 0; v < validVeretices.length; v++) {

        const x = validIndices[ v ]
        const xy_diagonal = x * maximumSegmentID + x
        values[ xy_diagonal ]++

        exclusionSet.add(v)
        const contactIndices = spatialIndex.within(validVeretices[ v ].x, validVeretices[ v ].y, validVeretices[ v ].z, distanceThreshold).filter(index => !exclusionSet.has(index))

        if (contactIndices.length > 0) {

            for (let contactIndex of contactIndices) {

                const y = validIndices[ contactIndex ]

                const xy = x * maximumSegmentID + y
                const yx = y * maximumSegmentID + x

                if (xy > values.length) {
                    console.error(`xy ${xy} is an invalid index for array of length ${ values.length }`)
                }

                if (yx > values.length) {
                    console.error(`yx ${yx} is an invalid index for array of length ${ values.length }`)
                }

                values[ xy ] += 1
                values[ yx ] += 1

            } // for (contactIndices)

        } // if (contactIndices.length > 0)

    } // for (v)

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
