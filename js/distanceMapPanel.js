import { guiManager } from './gui.js';
import Panel from "./panel.js";
import { globals } from "./app.js";
import { drawWithSharedCanvas, drawWithSharedUint8ClampedArray } from './utils.js';
import {threeJSColorToRGB255} from "./color.js";

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

        // this.ctx_trace = canvas.getContext('2d');
        this.ctx_trace = canvas.getContext('bitmaprenderer');

        // ensemble canvas and context
        canvas = $canvas_container.find('#spacewalk_distance_map_canvas_ensemble').get(0);
        canvas.width = $canvas_container.width();
        canvas.height = $canvas_container.height();

        // this.ctx_ensemble = canvas.getContext('2d');
        this.ctx_ensemble = canvas.getContext('bitmaprenderer');

        // const { width: w, height: h } = this.ctx_ensemble.canvas;
        // this.ctx_ensemble.fillStyle = rgb255String( appleCrayonColorRGB255('honeydew') );
        // this.ctx_ensemble.fillRect(0, 0, w, h);

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

        paintDistanceCanvas(average, maxAverageDistance);

        drawWithSharedUint8ClampedArray(this.ctx_ensemble);

    };

    updateTraceDistanceCanvas(trace) {

        const str = `Distance Map - Update Trace Distance.`;
        console.time(str);

        const maxDistance = updateDistanceArray(trace);

        console.timeEnd(str);

        paintDistanceCanvas(globals.sharedMapArray, maxDistance);

        drawWithSharedUint8ClampedArray(this.ctx_trace);

    };
}

const updateDistanceArray = trace => {

    const str = `Distance Map - Update Distance Array`;
    console.time(str);

    let mapSize = globals.ensembleManager.maximumSegmentID;

    globals.sharedMapArray.fill(kDistanceUndefined);

    let maxDistance = Number.NEGATIVE_INFINITY;

    let { segmentList } = trace;
    let { vertices } = trace.geometry;
    let { length } = vertices;

    let exclusionSet = new Set();

    for (let i = 0; i < length; i++) {

        const i_segmentIDIndex = segmentList[ i ].segmentID - 1;

        const xy_diagonal = i_segmentIDIndex * mapSize + i_segmentIDIndex;
        globals.sharedMapArray[ xy_diagonal ] = 0;

        exclusionSet.add(i);

        for (let j = 0; j < length; j++) {

            if (false === exclusionSet.has(j)) {

                const distance = vertices[ i ].distanceTo(vertices[ j ]);

                const j_segmentIDIndex = segmentList[ j ].segmentID - 1;

                const ij =  i_segmentIDIndex * mapSize + j_segmentIDIndex;
                const ji =  j_segmentIDIndex * mapSize + i_segmentIDIndex;

                globals.sharedMapArray[ ij ] = globals.sharedMapArray[ ji ] = distance;

                maxDistance = Math.max(maxDistance, distance);
            }

        } // for (j)

    }

    console.timeEnd(str);

    return maxDistance;

};

const paintDistanceCanvas = (distances, maximumDistance) => {

    const str = `Distance Map - Paint Canvas. Uint8ClampedArray.`;
    console.time(str);

    const colorMap = globals.colorMapManager.dictionary['juicebox_default'];
    const scale = colorMap.length - 1;

    let i = 0;
    for (let d of distances) {

        const interpolant = 1.0 - d/maximumDistance;
        const { r, g, b } = threeJSColorToRGB255(colorMap[ Math.floor(interpolant * scale) ][ 'threejs' ]);

        globals.sharedMapUint8ClampedArray[i++] = r;
        globals.sharedMapUint8ClampedArray[i++] = g;
        globals.sharedMapUint8ClampedArray[i++] = b;
        globals.sharedMapUint8ClampedArray[i++] = 255;
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
