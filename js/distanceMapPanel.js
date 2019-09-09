import { guiManager } from './gui.js';
import { appleCrayonColorRGB255, rgb255String } from "./color.js";
import Panel from "./panel.js";
import { globals } from "./app.js";

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

        this.ctx_trace = canvas.getContext('2d');

        // ensemble canvas and context
        canvas = $canvas_container.find('#spacewalk_distance_map_canvas_ensemble').get(0);
        canvas.width = $canvas_container.width();
        canvas.height = $canvas_container.height();

        this.ctx_ensemble = canvas.getContext('2d');

        const { width: w, height: h } = this.ctx_ensemble.canvas;
        this.ctx_ensemble.fillStyle = rgb255String( appleCrayonColorRGB255('honeydew') );
        this.ctx_ensemble.fillRect(0, 0, w, h);

    }

    updateEnsembleAverageDistanceCanvas(ensemble){

        const traces = Object.values(ensemble);

        const str = `Distance Map - Update Ensemble Distance. ${ traces.length } traces.`;
        console.time(str);

        let mapSize = globals.ensembleManager.maximumSegmentID;

        let counter = new Array(mapSize * mapSize);
        counter.fill(0);

        let average = new Array(mapSize * mapSize);
        average.fill(kDistanceUndefined);

        for (let trace of traces) {

            const dev_null = updateDistanceArray(trace);

            // We need to calculate an array of averages where the input data
            // can have missing - kDistanceUndefined - values

            // loop of the distance array
            for (let d = 0; d < globals.sharedMapArray.length; d++) {

                // ignore missing data values. they do not participate in the average
                if (kDistanceUndefined === globals.sharedMapArray[ d ]) {
                    // do nothing
                } else {

                    // keep track of how many samples we have at this array index
                    ++counter[ d ];

                    if (kDistanceUndefined === average[ d ]) {

                        // If this is the first data value at this array index copy it to average.
                        average[ d ] = globals.sharedMapArray[ d ];
                    } else {

                        // when there is data AND a pre-existing average value at this array index
                        // use an incremental averaging approach.

                        // Incremental averaging: avg_k = avg_k-1 + (distance_k - avg_k-1) / k
                        // https://math.stackexchange.com/questions/106700/incremental-averageing
                        average[ d ] = average[ d ] + (globals.sharedMapArray[ d ] - average[ d ]) / counter[ d ];
                    }

                }
            }

        }

        let maxAverageDistance = Number.NEGATIVE_INFINITY;
        for (let avg of average) {
            maxAverageDistance = Math.max(maxAverageDistance, avg);
        }

        console.timeEnd(str);

        paintDistanceCanvas(average, maxAverageDistance, globals.sharedMapCanvas);

    };

    updateTraceDistanceCanvas(trace) {

        const str = `Distance Map - Update Trace Distance.`;
        console.time(str);

        const maxDistance = updateDistanceArray(trace);

        console.timeEnd(str);

        paintDistanceCanvas(globals.sharedMapArray, maxDistance, globals.sharedMapCanvas);
    };

    drawEnsembleDistanceCanvas() {
        this.ctx_ensemble.drawImage(globals.sharedMapCanvas, 0, 0, globals.sharedMapCanvas.width, globals.sharedMapCanvas.height, 0, 0, this.ctx_ensemble.canvas.width, this.ctx_ensemble.canvas.height);
    }

    drawTraceDistanceCanvas() {
        this.ctx_trace.drawImage(globals.sharedMapCanvas, 0, 0, globals.sharedMapCanvas.width, globals.sharedMapCanvas.height, 0, 0, this.ctx_trace.canvas.width, this.ctx_trace.canvas.height);
    }

}

const updateDistanceArray = trace => {

    let mapSize = globals.ensembleManager.maximumSegmentID;

    globals.sharedMapArray.fill(kDistanceUndefined);

    let maxDistance = Number.NEGATIVE_INFINITY;

    let { vertices } = trace.geometry;
    let { segmentList } = trace;
    let { length } = vertices;

    let exclusionSet = new Set();

    for (let i = 0; i < length; i++) {

        const i_segmentIDIndex = segmentList[ i ].segmentID - 1;

        const xy_diagonal = i_segmentIDIndex * mapSize + i_segmentIDIndex;
        globals.sharedMapArray[ xy_diagonal ] = 0;

        exclusionSet.add(i);

        for (let j = 0; j < length; j++) {

            if (!exclusionSet.has(j)) {

                const distance = vertices[ i ].distanceTo(vertices[ j ]);

                const j_segmentIDIndex = segmentList[ j ].segmentID - 1;

                const ij =  i_segmentIDIndex * mapSize + j_segmentIDIndex;
                const ji =  j_segmentIDIndex * mapSize + i_segmentIDIndex;

                globals.sharedMapArray[ ij ] = globals.sharedMapArray[ ji ] = distance;

                maxDistance = Math.max(maxDistance, distance);
            }

        } // for (j)

    }

    return maxDistance;

};

const paintDistanceCanvas = (distances, maximumDistance, canvas) => {

    let ctx = canvas.getContext('2d');

    const str = `Distance Map - Paint Canvas ${ ctx.canvas.width } by ${ ctx.canvas.width }`;
    console.time(str);

    const { width: w, height: h } = ctx.canvas;
    ctx.fillStyle = rgb255String( appleCrayonColorRGB255('magnesium') );
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < w; i++) {
        for(let j = 0; j < h; j++) {

            const ij = i * w + j;

            if (kDistanceUndefined === distances[ ij ]) {
                // do nothing
            } else {
                const interpolant = 1.0 - distances[ ij ] / maximumDistance;
                ctx.fillStyle = globals.colorMapManager.retrieveRGB255String('juicebox_default', interpolant);
                ctx.fillRect(i, j, 1, 1);
            }

        }

    }

    console.timeEnd(str);

};

export let distanceMapPanelConfigurator = (container) => {

    return {
        container,
        panel: $('#spacewalk_distance_map_panel').get(0),
        isHidden: guiManager.isPanelHidden('spacewalk_distance_map_panel')
    };

};

export default DistanceMapPanel;
