import Panel from "./panel.js";
import { colorMapManager, ensembleManager } from "./app.js";
import { drawWithSharedUint8ClampedArray } from './utils.js';
import { appleCrayonColorRGB255, threeJSColorToRGB255 } from "./color.js";
import EnsembleManager from "./ensembleManager.js";
import SpacewalkEventBus from "./spacewalkEventBus.js"

const kDistanceUndefined = -1;

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
                this.updateTraceDistanceCanvas(this.trace)
                this.doUpdateTrace = undefined
            } else {
                this.doUpdateTrace = true
            }

        } else if ("DidLoadEnsembleFile" === type) {

            const { ensemble, trace } = data
            this.ensemble = ensemble
            this.trace = trace

            if (false === this.isHidden) {
                console.log('Calc distance map - trace and ensemble')
                this.updateEnsembleAverageDistanceCanvas(this.ensemble)
                this.updateTraceDistanceCanvas(this.trace)
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
            this.updateEnsembleAverageDistanceCanvas(this.ensemble)
            this.doUpdateEnsemble = undefined
        }

        if (true === this.doUpdateTrace) {
            console.log('Calc distance map - trace')
            this.updateTraceDistanceCanvas(this.trace)
            this.doUpdateTrace = undefined
        }

        super.present()

    }

    getClassName(){ return 'DistanceMapPanel' }

    updateEnsembleAverageDistanceCanvas(ensemble){

        const traces = Object.values(ensemble);

        const str = `Distance Map - Update Ensemble Distance. ${ traces.length } traces.`;
        console.time(str);

        let mapSize = ensembleManager.maximumSegmentID;

        let counter = new Array(mapSize * mapSize);
        counter.fill(0);

        let average = new Array(mapSize * mapSize);
        average.fill(kDistanceUndefined);

        for (let trace of traces) {

            const { distances } = updateDistanceArray(ensembleManager.maximumSegmentID, trace)

            // We need to calculate an array of averages where the input data
            // can have missing - kDistanceUndefined - values

            // loop of the distance array
            for (let d = 0; d < distances.length; d++) {

                // ignore missing data values. they do not participate in the average
                if (kDistanceUndefined === distances[ d ]) {
                    // do nothing
                } else {

                    // keep track of how many samples we have at this array index
                    ++counter[ d ];

                    if (kDistanceUndefined === average[ d ]) {

                        // If this is the first data value at this array index copy it to average.
                        average[ d ] = distances[ d ];
                    } else {

                        // when there is data AND a pre-existing average value at this array index
                        // use an incremental averaging approach.

                        // Incremental averaging: avg_k = avg_k-1 + (distance_k - avg_k-1) / k
                        // https://math.stackexchange.com/questions/106700/incremental-averageing
                        average[ d ] = average[ d ] + (distances[ d ] - average[ d ]) / counter[ d ];
                    }

                }
            }

        }

        let maxAverageDistance = Number.NEGATIVE_INFINITY;
        for (let avg of average) {
            maxAverageDistance = Math.max(maxAverageDistance, avg);
        }

        console.timeEnd(str);

        paintDistanceCanvas(average, maxAverageDistance);

        drawWithSharedUint8ClampedArray(this.ctx_ensemble, this.size, ensembleManager.sharedDistanceMapUint8ClampedArray);

    };

    updateTraceDistanceCanvas(trace) {

        const str = `Distance Map - Update Trace Distance.`;
        console.time(str);

        const { distances, maxDistance } = updateDistanceArray(ensembleManager.maximumSegmentID, trace)

        console.timeEnd(str);

        paintDistanceCanvas(distances, maxDistance);

        drawWithSharedUint8ClampedArray(this.ctx_trace, this.size, ensembleManager.sharedDistanceMapUint8ClampedArray);

    };
}

function updateDistanceArray(maximumSegmentID, trace) {

    const traceValues = Object.values(trace);
    const vertices = EnsembleManager.getSingleCentroidVerticesWithTrace(trace);

    const mapSize = maximumSegmentID

    const distances = new Array(mapSize * mapSize)
    distances.fill(kDistanceUndefined);

    let maxDistance = Number.NEGATIVE_INFINITY;

    let exclusionSet = new Set();

    for (let i = 0; i < vertices.length; i++) {

        const { colorRampInterpolantWindow } = traceValues[ i ];
        const i_segmentIndex = colorRampInterpolantWindow.segmentIndex;
        const xy_diagonal = i_segmentIndex * mapSize + i_segmentIndex;
        distances[ xy_diagonal ] = 0;

        exclusionSet.add(i);

        for (let j = 0; j < vertices.length; j++) {

            if (false === exclusionSet.has(j)) {

                const distance = vertices[ i ].distanceTo(vertices[ j ]);

                const { colorRampInterpolantWindow: colorRampInterpolantWindow_j } = traceValues[ j ];
                const j_segmentIndex = colorRampInterpolantWindow_j.segmentIndex;

                const ij =  i_segmentIndex * mapSize + j_segmentIndex;
                const ji =  j_segmentIndex * mapSize + i_segmentIndex;

                distances[ ij ] = distances[ ji ] = distance;

                maxDistance = Math.max(maxDistance, distance);
            }

        }

    }

    return { distances, maxDistance }

}

const paintDistanceCanvas = (distances, maximumDistance) => {

    const str = `Distance Map - Paint Canvas. Uint8ClampedArray.`;
    console.time(str);

    let i;

    i = 0;
    const { r, g, b } = appleCrayonColorRGB255('magnesium');
    for (let x = 0; x < distances.length; x++) {
        ensembleManager.sharedDistanceMapUint8ClampedArray[i++] = r;
        ensembleManager.sharedDistanceMapUint8ClampedArray[i++] = g;
        ensembleManager.sharedDistanceMapUint8ClampedArray[i++] = b;
        ensembleManager.sharedDistanceMapUint8ClampedArray[i++] = 255;
    }

    const colorMap = colorMapManager.dictionary['juicebox_default'];
    const scale = colorMap.length - 1;

    i = 0;
    for (let d of distances) {

        if (kDistanceUndefined !== d) {

            const interpolant = 1.0 - d/maximumDistance;
            const { r, g, b } = threeJSColorToRGB255(colorMap[ Math.floor(interpolant * scale) ][ 'threejs' ]);

            ensembleManager.sharedDistanceMapUint8ClampedArray[i + 0] = r;
            ensembleManager.sharedDistanceMapUint8ClampedArray[i + 1] = g;
            ensembleManager.sharedDistanceMapUint8ClampedArray[i + 2] = b;
            ensembleManager.sharedDistanceMapUint8ClampedArray[i + 3] = 255;
        }

        i += 4;
    }

    console.timeEnd(str);

};

export let distanceMapPanelConfigurator = ({ container, isHidden }) => {

    return {
        container,
        panel: $('#spacewalk_distance_map_panel').get(0),
        isHidden
    };

};

export default DistanceMapPanel;
