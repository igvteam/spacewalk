import Panel from "./panel.js";
import { colorMapManager, ensembleManager } from "./app.js";
import { drawWithSharedUint8ClampedArray } from './utils.js';
import { appleCrayonColorRGB255, threeJSColorToRGB255 } from "./color.js";
import SpacewalkEventBus from "./spacewalkEventBus.js"
import {clamp} from './math.js'

const kDistanceUndefined = -1

let canvasArray = undefined

class DistanceMapPanel extends Panel {

    constructor ({ container, panel, isHidden }) {

        const xFunction = (cw, w) => {
            return cw - w * 1.1;
        };

        const yFunction = (ch, h) => {
            return ch - (h * 1.1);
        };

        super({ container, panel, isHidden, xFunction, yFunction });

        const $canvas_container = this.$panel.find('#spacewalk_distance_map_panel_container');

        let canvas;

        // trace canvas and context
        canvas = $canvas_container.find('#spacewalk_distance_map_canvas_trace').get(0);
        canvas.width = $canvas_container.width();
        canvas.height = $canvas_container.height();

        this.ctx_trace = canvas.getContext('bitmaprenderer');

        // ensemble canvas and context
        canvas = $canvas_container.find('#spacewalk_distance_map_canvas_ensemble').get(0);
        canvas.width = $canvas_container.width();
        canvas.height = $canvas_container.height();

        this.size = { width: canvas.width, height: canvas.height };

        this.ctx_ensemble = canvas.getContext('bitmaprenderer');

        this.doUpdateTrace = this.doUpdateEnsemble = undefined

        // this.worker = new Worker('./js/distanceMapWorker.js')

        // this.worker.addEventListener('message', ({ data }) => {
        //
        //     console.log('panel received message from worker')
        //
        //     if ('trace' === data.traceOrEnsemble) {
        //         populateDistanceCanvasArray(data.distances, ensembleManager.maximumSegmentID, data.maxDistance, colorMapManager.dictionary['juicebox_default'])
        //         drawWithSharedUint8ClampedArray(this.ctx_trace, this.size, canvasArray)
        //     } else {
        //         populateDistanceCanvasArray(data.averages, ensembleManager.maximumSegmentID, data.maxAverageDistance, colorMapManager.dictionary['juicebox_default'])
        //         drawWithSharedUint8ClampedArray(this.ctx_ensemble, this.size, canvasArray)
        //     }
        //
        //
        // }, false)

        SpacewalkEventBus.globalBus.subscribe('DidSelectTrace', this);
        SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this);

    }

    receiveEvent({ type, data }) {

        if ("DidSelectTrace" === type) {

            const { trace } = data
            this.trace = trace

            if (false === this.isHidden) {
                console.log('Calc distance map - trace')
                this.updateTraceDistanceCanvas(ensembleManager.maximumSegmentID, this.trace)
                this.doUpdateTrace = undefined
            } else {
                this.doUpdateTrace = true
            }

        } else if ("DidLoadEnsembleFile" === type) {

            const { ensemble, trace } = data
            this.ensemble = ensemble
            this.trace = trace

            initializeSharedBuffers(ensembleManager.maximumSegmentID)

            if (false === this.isHidden) {
                console.log('Calc distance map - trace and ensemble')
                this.updateEnsembleAverageDistanceCanvas(ensembleManager.maximumSegmentID, this.ensemble)
                this.updateTraceDistanceCanvas(ensembleManager.maximumSegmentID, this.trace)
                this.doUpdateTrace = this.doUpdateEnsemble = undefined
            } else {
                this.doUpdateTrace = this.doUpdateEnsemble = true
            }

        }

        super.receiveEvent({ type, data });
    }

    present() {

        if (true === this.doUpdateEnsemble) {
            console.log('Calc distance map - ensemble')
            this.updateEnsembleAverageDistanceCanvas(ensembleManager.maximumSegmentID, this.ensemble)
            this.doUpdateEnsemble = undefined
        }

        if (true === this.doUpdateTrace) {
            console.log('Calc distance map - trace')
            this.updateTraceDistanceCanvas(ensembleManager.maximumSegmentID, this.trace)
            this.doUpdateTrace = undefined
        }

        super.present()

    }

    getClassName(){ return 'DistanceMapPanel' }

    updateTraceDistanceCanvas(maximumSegmentID, trace) {

        // const str = `Distance Map - Update Trace Distance.`;
        // console.time(str);

        const traceValues = Object.values(trace);
        const vertices = getSingleCentroidVerticesWithTrace(trace);
        const { maxDistance, distances } = updateTraceDistanceArray(maximumSegmentID, traceValues, vertices)

        // console.timeEnd(str);

        populateDistanceCanvasArray(distances, maximumSegmentID, maxDistance, colorMapManager.dictionary['juicebox_default'])
        drawWithSharedUint8ClampedArray(this.ctx_trace, this.size, canvasArray);

    }

    updateEnsembleAverageDistanceCanvas(maximumSegmentID, ensemble){
        const traces = Object.values(ensemble);
        const averages = updateEnsembleDistanceArray(maximumSegmentID, traces)
        let maxAverageDistance = Number.NEGATIVE_INFINITY;
        for (let avg of averages) {
            maxAverageDistance = Math.max(maxAverageDistance, avg);
        }

        populateDistanceCanvasArray(averages, maximumSegmentID, maxAverageDistance, colorMapManager.dictionary['juicebox_default'])
        drawWithSharedUint8ClampedArray(this.ctx_ensemble, this.size, canvasArray)

    }

    __updateTraceDistanceCanvas(maximumSegmentID, trace) {

        const data =
            {
                traceOrEnsemble: 'trace',
                distances: sharedBuffers.distances,
                maximumSegmentID,
                trace,
            }

        this.worker.postMessage(data)

    }

    __updateEnsembleAverageDistanceCanvas(maximumSegmentID, ensemble){

        const data =
            {
                traceOrEnsemble: 'ensemble',
                sharedBuffers,
                maximumSegmentID,
                traces: Object.values(ensemble),
            }

        this.worker.postMessage(data)

    }
}

function updateTraceDistanceArray(maximumSegmentID, traceValues, vertices) {

    const distances = new Float32Array(maximumSegmentID * maximumSegmentID)
    distances.fill(kDistanceUndefined)

    let maxDistance = Number.NEGATIVE_INFINITY;

    const exclusionSet = new Set()
    for (let i = 0; i < vertices.length; i++) {

        const { colorRampInterpolantWindow } = traceValues[ i ]
        const i_segmentIndex = colorRampInterpolantWindow.segmentIndex
        const xy_diagonal = i_segmentIndex * maximumSegmentID + i_segmentIndex
        distances[ xy_diagonal ] = 0.0

        exclusionSet.add(i);

        for (let j = 0; j < vertices.length; j++) {

            if (false === exclusionSet.has(j)) {

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

        const traceValues = Object.values(trace)
        const vertices = getSingleCentroidVerticesWithTrace(trace)
        const { distances } = updateTraceDistanceArray(maximumSegmentID, traceValues, vertices)

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

    return averages
}

function populateDistanceCanvasArray(distances, maximumSegmentID, maximumDistance, colorMap) {

    let i = 0;
    const { r, g, b } = appleCrayonColorRGB255('magnesium');
    for (let x = 0; x < distances.length; x++) {
        canvasArray[i++] = r;
        canvasArray[i++] = g;
        canvasArray[i++] = b;
        canvasArray[i++] = 255;
    }


    const scale = colorMap.length - 1;

    i = 0;
    for (let distance of distances) {

        if (kDistanceUndefined !== distance) {

            const interpolant = distance/maximumDistance
            if (interpolant < 0 || 1 < interpolant) {
                console.log(`${ Date.now() } populateDistanceCanvasArray - interpolant out of range ${ interpolant }`)
            }

            const interpolantFlipped = 1.0 - clamp(interpolant, 0, 1)
            const interpolantScaled = scale * interpolantFlipped

            const { r, g, b } = threeJSColorToRGB255(colorMap[ Math.floor(interpolantScaled) ][ 'threejs' ]);

            canvasArray[i + 0] = r;
            canvasArray[i + 1] = g;
            canvasArray[i + 2] = b;
            canvasArray[i + 3] = 255;
        }

        i += 4;
    }

}

function initializeSharedBuffers(maximumSegmentID) {
    canvasArray = new Uint8ClampedArray(maximumSegmentID * maximumSegmentID * 4)
}

function getSingleCentroidVerticesWithTrace(trace) {

    return Object.values(trace)
        .map(({ geometry }) => {
            const [ x, y, z ] = geometry.attributes.position.array
            return { x, y, z }
        })

}

function distanceTo(a, b) {
    return Math.sqrt( distanceToSquared(a, b) )
}

function distanceToSquared(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z
    return dx * dx + dy * dy + dz * dz
}

export function distanceMapPanelConfigurator({ container, isHidden }) {

    return {
        container,
        panel: document.querySelector('#spacewalk_distance_map_panel'),
        isHidden
    };

}

export default DistanceMapPanel;
