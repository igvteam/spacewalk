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

    const spatialIndex = new KDBush(kdBushConfiguratorWithTrace(locationList))

    for (let i = 0; i < locationList.length; i++) {

        exclusionSet.add(i)

        const xy_diagonal = locationList[ i ].segmentIndex * maximumSegmentID + locationList[ i ].segmentIndex

        values[ xy_diagonal ]++

        const contact_indices = spatialIndex.within(locationList[ i ].x, locationList[ i ].y, locationList[ i ].z, distanceThreshold).filter(index => !exclusionSet.has(index))

        if (contact_indices.length > 0) {
            for (let j of contact_indices) {

                const xy = locationList[ i ].segmentIndex * maximumSegmentID + locationList[ j ].segmentIndex
                const yx = locationList[ j ].segmentIndex * maximumSegmentID + locationList[ i ].segmentIndex

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
