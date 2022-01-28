
self.addEventListener('message', ({ data }) => {

    if ('trace' === data.traceOrEnsemble) {
        const { maxDistance, distances } = updateTraceDistanceArray(data.distances, data.maximumSegmentID, data.trace)
        self.postMessage({ maxDistance, distances, traceOrEnsemble: data.traceOrEnsemble })
    } else {
        const { maxAverageDistance, averages } = updateEnsembleDistanceArray(data.sharedBuffers, data.maximumSegmentID, data.traces)
        self.postMessage({ maxAverageDistance, averages, traceOrEnsemble: data.traceOrEnsemble })
    }

}, false)

const kDistanceUndefined = -1;

function updateTraceDistanceArray(distances, maximumSegmentID, trace) {

    distances.fill(kDistanceUndefined);

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

function updateEnsembleDistanceArray(sharedBuffers, maximumSegmentID, traces) {

    sharedBuffers.counters.fill(0)
    sharedBuffers.averages.fill(kDistanceUndefined)

    for (let trace of traces) {

        const traceValues = Object.values(trace)
        const vertices = getSingleCentroidVerticesWithTrace(trace)

        const { maxDistance, distances } = updateTraceDistanceArray(sharedBuffers.distances, maximumSegmentID, traceValues, vertices)

        // We need to calculate an array of averages where the input data
        // can have missing - kDistanceUndefined - values

        // loop over distance array
        for (let d = 0; d < distances.length; d++) {

            // ignore missing data values. they do not participate in the average
            if (kDistanceUndefined === distances[ d ]) {
                // do nothing
            } else {

                // keep track of how many samples we have at this array index
                ++sharedBuffers.counters[ d ];

                if (kDistanceUndefined === sharedBuffers.averages[ d ]) {

                    // If this is the first data value at this array index copy it to average.
                    sharedBuffers.averages[ d ] = distances[ d ];
                } else {

                    // when there is data AND a pre-existing average value at this array index
                    // use an incremental averaging approach.

                    // Incremental averaging: avg_k = avg_k-1 + (distance_k - avg_k-1) / k
                    // https://math.stackexchange.com/questions/106700/incremental-averageing
                    sharedBuffers.averages[ d ] = sharedBuffers.averages[ d ] + (distances[ d ] - sharedBuffers.averages[ d ]) / sharedBuffers.counters[ d ];
                }

            }
        }

    }

    let maxAverageDistance = Number.NEGATIVE_INFINITY;
    for (let avg of sharedBuffers.averages) {
        maxAverageDistance = Math.max(maxAverageDistance, avg)
    }

    return { maxAverageDistance, averages: sharedBuffers.averages }
}

function getSingleCentroidVerticesWithTrace(trace) {

    return Object.values(trace)
        .map(({ geometry }) => {
            const [ x, y, z ] = geometry.attributes.position.array
            return { x, y, z }
        });

}

function distanceTo(a, b) {
    return Math.sqrt( distanceToSquared(a, b) )
}

function distanceToSquared(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z
    return dx * dx + dy * dy + dz * dz
}
