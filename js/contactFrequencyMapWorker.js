import KDBush from './kd3d/kd3d.js'

self.addEventListener('message', ({ data }) => {

    const str = `Contact Frequency Map Worker - Calculate Frequency Values`
    console.time(str)

    const values = new Float32Array(data.maximumSegmentID * data.maximumSegmentID)
    const locationListOfListsString = 'trace' === data.traceOrEnsemble ? [ JSON.parse(data.itemsString) ] : JSON.parse(data.locationListOfListsString)
    calculateContactFrequencies(values, data.maximumSegmentID, locationListOfListsString, data.distanceThreshold)

    console.timeEnd(str)

    const payload =
        {
            traceOrEnsemble: data.traceOrEnsemble,
            workerValuesBuffer: values
        }

    self.postMessage(payload, [ values.buffer ])

}, false)

function calculateContactFrequencies(values, maximumSegmentID, locationListOfListsString, distanceThreshold) {
    values.fill(0)
    for (let locationList of locationListOfListsString) {
        accumulateContactFrequencies(values, maximumSegmentID, locationList, distanceThreshold)
    }
}

function accumulateContactFrequencies(values, maximumSegmentID, locationList, distanceThreshold) {

    const exclusionSet = new Set();

    const validData = []
    const validIndices = []

    for (let i = 0; i < locationList.length; i++) {
        if (true === locationList[ i ].isMissingData) {
            // ignore
        } else {
            validIndices.push(i)
            validData.push(locationList[ i ])
        }
    }

    const spatialIndex = new KDBush(kdBushConfiguratorWithTrace(validData))

    for (let v = 0; v < validData.length; v++) {

        const i = validIndices[ v ]
        const xy_diagonal = i * maximumSegmentID + i
        values[ xy_diagonal ]++

        exclusionSet.add(v)
        const contactIndices = spatialIndex.within(validData[ v ].x, validData[ v ].y, validData[ v ].z, distanceThreshold).filter(index => !exclusionSet.has(index))

        if (contactIndices.length > 0) {

            for (let contactIndex of contactIndices) {

                const j = validIndices[ contactIndex ]

                const xy = i * maximumSegmentID + j
                const yx = j * maximumSegmentID + i

                if (xy > values.length) {
                    console.log('xy is bogus index ' + xy)
                }

                if (yx > values.length) {
                    console.log('yx is bogus index ' + yx)
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
