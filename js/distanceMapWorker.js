import { distanceTo, getSingleCentroidVerticesWithTrace } from './distanceMapWorkerUtils.js'

self.addEventListener('message', ({ data }) => {

    if ('trace' === data.traceOrEnsemble) {

        const str = `Distance Map Worker - Update Trace Distance Array`
        console.time(str);

        const { maxDistance, distances } = updateTraceDistanceArray(data.maximumSegmentID, data.trace)

        console.timeEnd(str)

        const payload =
            {
                traceOrEnsemble: data.traceOrEnsemble,
                workerDistanceBuffer: distances,
                maxDistance
            }

        self.postMessage(payload, [ distances.buffer ])

    } else {


        const str = `Distance Map Worker - Update Ensemble Distance Array`
        console.time(str);

        const { maxAverageDistance, averages } = updateEnsembleDistanceArray(data.maximumSegmentID, data.traces)

        console.timeEnd(str)

        const payload =
            {
                traceOrEnsemble: data.traceOrEnsemble,
                workerDistanceBuffer: averages,
                maxDistance: maxAverageDistance
            }

        self.postMessage(payload, [ averages.buffer ])

    }

}, false)

const kDistanceUndefined = -1;

function updateTraceDistanceArray(maximumSegmentID, trace) {

    const distances = new Float32Array(maximumSegmentID * maximumSegmentID)
    distances.fill(kDistanceUndefined)

    let maxDistance = Number.NEGATIVE_INFINITY;

    let exclusionSet = new Set();

    const traceValues = Object.values(trace)
    const vertices = getSingleCentroidVerticesWithTrace(trace)

    for (let i = 0; i < vertices.length; i++) {

        const { colorRampInterpolantWindow } = traceValues[ i ];
        const i_segmentIndex = colorRampInterpolantWindow.segmentIndex;
        const xy_diagonal = i_segmentIndex * maximumSegmentID + i_segmentIndex;
        distances[ xy_diagonal ] = 0;

        exclusionSet.add(i);

        for (let j = 0; j < vertices.length; j++) {

            if (false === exclusionSet.has(j)) {

                // const distance = vertices[ i ].distanceTo(vertices[ j ]);
                const distance = distanceTo(vertices[ i ], vertices[ j ])

                const { colorRampInterpolantWindow: colorRampInterpolantWindow_j } = traceValues[ j ];
                const j_segmentIndex = colorRampInterpolantWindow_j.segmentIndex;

                const ij =  i_segmentIndex * maximumSegmentID + j_segmentIndex;
                const ji =  j_segmentIndex * maximumSegmentID + i_segmentIndex;

                distances[ ij ] = distances[ ji ] = distance;

                maxDistance = Math.max(maxDistance, distance);
            }

        }

    }

    return { maxDistance, distances }

}

function updateEnsembleDistanceArray(maximumSegmentID, traces) {

    const averages  = new Float32Array(maximumSegmentID * maximumSegmentID)
    averages.fill(kDistanceUndefined)

    const counters = new Int32Array(maximumSegmentID * maximumSegmentID)
    counters.fill(0)

    for (let trace of traces) {

        const { maxDistance, distances } = updateTraceDistanceArray(maximumSegmentID, trace)

        // We need to calculate an array of averages where the input data
        // can have missing - kDistanceUndefined - values

        // loop over distance array
        for (let d = 0; d < distances.length; d++) {

            // ignore missing data values. they do not participate in the average
            if (kDistanceUndefined === distances[ d ]) {
                // do nothing
            } else {

                // keep track of how many samples we have at this array index
                ++counters[ d ];

                if (kDistanceUndefined === averages[ d ]) {

                    // If this is the first data value at this array index copy it to average.
                    averages[ d ] = distances[ d ];
                } else {

                    // when there is data AND a pre-existing average value at this array index
                    // use an incremental averaging approach.

                    // Incremental averaging: avg_k = avg_k-1 + (distance_k - avg_k-1) / k
                    // https://math.stackexchange.com/questions/106700/incremental-averageing
                    averages[ d ] = averages[ d ] + (distances[ d ] - averages[ d ]) / counters[ d ];
                }

            }
        }

    }

    let maxAverageDistance = Number.NEGATIVE_INFINITY;
    for (let avg of averages) {
        maxAverageDistance = Math.max(maxAverageDistance, avg)
    }

    return { maxAverageDistance, averages }
}

