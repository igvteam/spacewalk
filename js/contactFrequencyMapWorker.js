import KDBush from './kd3d/kd3d.js'
import { getSingleCentroidVerticesWithTrace } from './webWorkerUtils.js'

self.addEventListener('message', ({ data }) => {

    const str = `Contact Frequency Map Worker - Calculate Frequency Values`
    console.time(str)

    const values = new Float32Array(data.maximumSegmentID * data.maximumSegmentID)
    const traces = 'trace' === data.traceOrEnsemble ? [ data.trace ] : Object.values(data.ensemble)
    calculateContactFrequencies(values, data.maximumSegmentID, traces, data.distanceThreshold)

    console.timeEnd(str)

    const payload =
        {
            traceOrEnsemble: data.traceOrEnsemble,
            workerValuesBuffer: values
        }

    self.postMessage(payload, [ values.buffer ])

}, false)

function calculateContactFrequencies(values, maximumSegmentID, traces, distanceThreshold) {
    values.fill(0)
    for (let trace of traces) {
        accumulateContactFrequencies(values, maximumSegmentID, trace, distanceThreshold)
    }
}

function accumulateContactFrequencies(values, maximumSegmentID, trace, distanceThreshold) {

    const exclusionSet = new Set();

    const vertices = getSingleCentroidVerticesWithTrace(trace)
    const traceValues = Object.values(trace)
    const spatialIndex = new KDBush(kdBushConfiguratorWithTrace(vertices))

    for (let i = 0; i < vertices.length; i++) {

        const { x, y, z } = vertices[ i ];

        exclusionSet.add(i);
        const { colorRampInterpolantWindow } = traceValues[ i ];

        const i_segmentIndex = colorRampInterpolantWindow.segmentIndex;
        const xy_diagonal = i_segmentIndex * maximumSegmentID + i_segmentIndex;

        values[ xy_diagonal ]++;

        const contact_indices = spatialIndex.within(x, y, z, distanceThreshold).filter(index => !exclusionSet.has(index));

        if (contact_indices.length > 0) {
            for (let j of contact_indices) {

                const { colorRampInterpolantWindow: colorRampInterpolantWindow_j } = traceValues[ j ];

                const j_segmentIndex = colorRampInterpolantWindow_j.segmentIndex;

                const xy = i_segmentIndex * maximumSegmentID + j_segmentIndex;
                const yx = j_segmentIndex * maximumSegmentID + i_segmentIndex;

                if (xy > values.length) {
                    console.log('xy is bogus index ' + xy);
                }

                if (yx > values.length) {
                    console.log('yx is bogus index ' + yx);
                }

                values[ xy ] += 1;

                values[ yx ] = values[ xy ];

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
