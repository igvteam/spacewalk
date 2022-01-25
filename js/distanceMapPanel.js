import Panel from "./panel.js";
import { colorMapManager, ensembleManager } from "./app.js";
import { drawWithSharedUint8ClampedArray } from './utils.js';
import { appleCrayonColorRGB255, threeJSColorToRGB255 } from "./color.js";
import { getSingleCentroidVerticesWithTrace } from "./ensembleManager.js";
import SpacewalkEventBus from "./spacewalkEventBus.js"

const kDistanceUndefined = -1;

const sharedBuffers =
    {
        counters: undefined,
        averages: undefined,
        distances: undefined,
        canvasArray: undefined
    }

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

    updateEnsembleAverageDistanceCanvas(maximumSegmentID, ensemble){

        const traces = Object.values(ensemble);

        const str = `Distance Map - Update Ensemble Distance. ${ traces.length } traces.`;
        console.time(str);

        sharedBuffers.counters.fill(0)
        sharedBuffers.averages.fill(kDistanceUndefined)

        updateEnsembleDistanceArray(sharedBuffers, maximumSegmentID, traces)

        let maxAverageDistance = Number.NEGATIVE_INFINITY;
        for (let avg of sharedBuffers.averages) {
            maxAverageDistance = Math.max(maxAverageDistance, avg);
        }

        console.timeEnd(str);

        populateDistanceCanvasArray(sharedBuffers.averages, maximumSegmentID, maxAverageDistance, colorMapManager.dictionary['juicebox_default'])
        drawWithSharedUint8ClampedArray(this.ctx_ensemble, this.size, sharedBuffers.canvasArray)

    }

    updateTraceDistanceCanvas(maximumSegmentID, trace) {

        const worker = new Worker('./js/distanceMapWorker.js')

        // worker.addEventListener('message', ({ data }) => {
        //     console.log('DistanceMapWorker says: ', data)
        // }, false)
        //
        // worker.postMessage('updateTraceDistanceCanvas called a web worker. Cool!')
        //
        // worker.postMessage(thang)

        const thang = { contact: 2, distance: 4 }

        worker.addEventListener('message', ({ data }) => {
            const { contact, distance } = data
            console.log(`DistanceMapWorker says - contact ${ contact } distance ${ distance }`)
        }, false)

        worker.postMessage(thang)

        // const str = `Distance Map - Update Trace Distance.`;
        // console.time(str);

        const traceValues = Object.values(trace);
        const vertices = getSingleCentroidVerticesWithTrace(trace);
        const maxDistance = updateTraceDistanceArray(sharedBuffers, maximumSegmentID, traceValues, vertices)

        // console.timeEnd(str);

        populateDistanceCanvasArray(sharedBuffers.distances, maximumSegmentID, maxDistance, colorMapManager.dictionary['juicebox_default'])
        drawWithSharedUint8ClampedArray(this.ctx_trace, this.size, sharedBuffers.canvasArray);

    }
}

function updateEnsembleDistanceArray(sharedBuffers, maximumSegmentID, traces) {

    for (let trace of traces) {

        const traceValues = Object.values(trace)
        const vertices = getSingleCentroidVerticesWithTrace(trace)

        const ignored = updateTraceDistanceArray(sharedBuffers, maximumSegmentID, traceValues, vertices)

        // We need to calculate an array of averages where the input data
        // can have missing - kDistanceUndefined - values

        // loop of the distance array
        for (let d = 0; d < sharedBuffers.distances.length; d++) {

            // ignore missing data values. they do not participate in the average
            if (kDistanceUndefined === sharedBuffers.distances[ d ]) {
                // do nothing
            } else {

                // keep track of how many samples we have at this array index
                ++sharedBuffers.counters[ d ];

                if (kDistanceUndefined === sharedBuffers.averages[ d ]) {

                    // If this is the first data value at this array index copy it to average.
                    sharedBuffers.averages[ d ] = sharedBuffers.distances[ d ];
                } else {

                    // when there is data AND a pre-existing average value at this array index
                    // use an incremental averaging approach.

                    // Incremental averaging: avg_k = avg_k-1 + (distance_k - avg_k-1) / k
                    // https://math.stackexchange.com/questions/106700/incremental-averageing
                    sharedBuffers.averages[ d ] = sharedBuffers.averages[ d ] + (sharedBuffers.distances[ d ] - sharedBuffers.averages[ d ]) / sharedBuffers.counters[ d ];
                }

            }
        }

    }

}

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

function populateDistanceCanvasArray(distances, maximumSegmentID, maximumDistance, colorMap) {

    let i = 0;
    const { r, g, b } = appleCrayonColorRGB255('magnesium');
    for (let x = 0; x < distances.length; x++) {
        sharedBuffers.canvasArray[i++] = r;
        sharedBuffers.canvasArray[i++] = g;
        sharedBuffers.canvasArray[i++] = b;
        sharedBuffers.canvasArray[i++] = 255;
    }


    const scale = colorMap.length - 1;

    i = 0;
    for (let d of distances) {

        if (kDistanceUndefined !== d) {

            const interpolant = 1.0 - d/maximumDistance;
            const { r, g, b } = threeJSColorToRGB255(colorMap[ Math.floor(interpolant * scale) ][ 'threejs' ]);

            sharedBuffers.canvasArray[i + 0] = r;
            sharedBuffers.canvasArray[i + 1] = g;
            sharedBuffers.canvasArray[i + 2] = b;
            sharedBuffers.canvasArray[i + 3] = 255;
        }

        i += 4;
    }

}

function initializeSharedBuffers(maximumSegmentID) {
    sharedBuffers.counters = sharedBuffers.averages = sharedBuffers.distances = new Array(maximumSegmentID * maximumSegmentID)
    sharedBuffers.canvasArray = new Uint8ClampedArray(maximumSegmentID * maximumSegmentID * 4)
}

export function distanceMapPanelConfigurator({ container, isHidden }) {

    return {
        container,
        panel: document.querySelector('#spacewalk_distance_map_panel'),
        isHidden
    };

}

export default DistanceMapPanel;
