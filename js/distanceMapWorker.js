
// self.addEventListener('message', ({ data }) => {
//     self.postMessage(data)
// }, false)

self.addEventListener('message', ({ data }) => {

    data.contact = 777
    data.distance = 11011

    self.postMessage(data)
}, false)

// self.addEventListener('message', ({ sharedBuffers, maximumSegmentID, traceValues, vertices }) => {
//
//     const maxDistance = updateTraceDistanceArray(sharedBuffers, maximumSegmentID, traceValues, vertices)
//
//     self.postMessage(maxDistance)
//
// }, false)

const kDistanceUndefined = -1;

function updateTraceDistanceArray(sharedBuffers, maximumSegmentID, traceValues, vertices) {

    sharedBuffers.distances.fill(kDistanceUndefined);

    let maxDistance = Number.NEGATIVE_INFINITY;

    let exclusionSet = new Set();

    for (let i = 0; i < vertices.length; i++) {

        const { colorRampInterpolantWindow } = traceValues[ i ];
        const i_segmentIndex = colorRampInterpolantWindow.segmentIndex;
        const xy_diagonal = i_segmentIndex * maximumSegmentID + i_segmentIndex;
        sharedBuffers.distances[ xy_diagonal ] = 0;

        exclusionSet.add(i);

        for (let j = 0; j < vertices.length; j++) {

            if (false === exclusionSet.has(j)) {

                const distance = vertices[ i ].distanceTo(vertices[ j ]);

                const { colorRampInterpolantWindow: colorRampInterpolantWindow_j } = traceValues[ j ];
                const j_segmentIndex = colorRampInterpolantWindow_j.segmentIndex;

                const ij =  i_segmentIndex * maximumSegmentID + j_segmentIndex;
                const ji =  j_segmentIndex * maximumSegmentID + i_segmentIndex;

                sharedBuffers.distances[ ij ] = sharedBuffers.distances[ ji ] = distance;

                maxDistance = Math.max(maxDistance, distance);
            }

        }

    }

    return maxDistance

}
