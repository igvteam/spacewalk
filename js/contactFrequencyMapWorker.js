import KDBush from './kd3d/kd3d.js'

self.addEventListener('message', ({ data }) => {

    const str = `Contact Frequency Map Worker - Calculate Frequency Values`
    console.time(str)

    const contactFrequency = new Float32Array(data.maximumSegmentID * data.maximumSegmentID)
    const vertexLists = 'trace' === data.traceOrEnsemble ? [ JSON.parse(data.verticesString) ] : JSON.parse(data.vertexListsString)
    calculateContactFrequencies(contactFrequency, data.maximumSegmentID, vertexLists, data.distanceThreshold)

    console.timeEnd(str)

    const payload =
        {
            traceOrEnsemble: data.traceOrEnsemble,
            workerValuesBuffer: contactFrequency
        }

    self.postMessage(payload, [ contactFrequency.buffer ])

}, false)


const kContactFrequencyUndefined = -1

function calculateContactFrequencies(contactFrequency, maximumSegmentID, vertexLists, distanceThreshold) {
    contactFrequency.fill(kContactFrequencyUndefined)
    for (let vertices of vertexLists) {
        accumulateContactFrequencies(contactFrequency, maximumSegmentID, vertices, distanceThreshold)
    }
}

function accumulateContactFrequencies(contactFrequency, maximumSegmentID, vertices, distanceThreshold) {

    const exclusionSet = new Set();

    const validVertices = []
    const validIndices = []

    for (let i = 0; i < vertices.length; i++) {
        if (true === vertices[ i ].isMissingData) {
            // ignore
        } else {
            validIndices.push(i)
            validVertices.push(vertices[ i ])
        }
    }

    const spatialIndex = new KDBush(kdBushConfiguratorWithTrace(validVertices))

    for (let v = 0; v < validVertices.length; v++) {

        const x = validIndices[ v ]
        const xy_diagonal = x * maximumSegmentID + x
        contactFrequency[ xy_diagonal ] = 1

        exclusionSet.add(v)
        const contactIndices = spatialIndex.within(validVertices[ v ].x, validVertices[ v ].y, validVertices[ v ].z, distanceThreshold).filter(index => !exclusionSet.has(index))

        if (contactIndices.length > 0) {

            for (let contactIndex of contactIndices) {

                const y = validIndices[ contactIndex ]

                const xy = x * maximumSegmentID + y
                const yx = y * maximumSegmentID + x

                if (xy > contactFrequency.length) {
                    console.error(`xy ${xy} is an invalid index for array of length ${ contactFrequency.length }`)
                }

                if (yx > contactFrequency.length) {
                    console.error(`yx ${yx} is an invalid index for array of length ${ contactFrequency.length }`)
                }

                contactFrequency[ xy ] = kContactFrequencyUndefined === contactFrequency[ xy ] ? 1 : 1 + contactFrequency[ xy ]
                contactFrequency[ yx ] = contactFrequency[ xy ]

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
