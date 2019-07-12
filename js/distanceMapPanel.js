import Globals from './globals.js';
import { makeDraggable } from "./draggable.js";
import { presentPanel, moveOffScreen, moveOnScreen } from "./utils.js";
import { guiManager } from './gui.js';
import { appleCrayonColorRGB255, rgb255String } from "./color.js";

const kDistanceUndefined = -1;

class DistanceMapPanel {

    constructor ({ container, panel, isHidden }) {

        this.container = container;
        this.$panel = $(panel);

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


        this.isHidden = isHidden;

        if (isHidden) {
            moveOffScreen(this);
        } else {
            this.layout();
        }

        makeDraggable(panel, this.$panel.find('.spacewalk_card_drag_container').get(0));

        $(window).on('resize.distance_map_panel', () => { this.onWindowResize(container, panel) });

        this.$panel.on('click.distance_map_panel', event => {
            Globals.eventBus.post({ type: "DidSelectPanel", data: this.$panel });
        });

        Globals.eventBus.subscribe("ToggleUIControl", this);
        Globals.eventBus.subscribe('DidLoadFile', this);
        Globals.eventBus.subscribe('DidLoadPointCloudFile', this);

    }

    receiveEvent({ type, data }) {

        if ("ToggleUIControl" === type && data && data.payload === this.$panel.attr('id')) {

            if (this.isHidden) {
                moveOnScreen(this);
            } else {
                moveOffScreen(this);
            }
            this.isHidden = !this.isHidden;
        } else if ('DidLoadFile' === type || 'DidLoadPointCloudFile' === type) {
            // presentPanel(this);
        }
    }

    onWindowResize() {
        if (false === this.isHidden) {
            this.layout();
        }
    }

    layout() {

        const { width: cw, height: ch } = this.container.getBoundingClientRect();
        const { width: pw, height: ph } = this.$panel.get(0).getBoundingClientRect();

        const left = cw - 1.1 * pw;
        const  top = ch - 1.1 * ph;

        this.$panel.offset( { left, top } );

    }

    drawTraceDistanceCanvas(traceDistanceCanvas) {
        this.ctx_trace.drawImage(traceDistanceCanvas, 0, 0, traceDistanceCanvas.width, traceDistanceCanvas.height, 0, 0, this.ctx_trace.canvas.width, this.ctx_trace.canvas.height);
    }

    drawEnsembleDistanceCanvas(ensembleDistanceCanvas) {
        this.ctx_ensemble.drawImage(ensembleDistanceCanvas, 0, 0, ensembleDistanceCanvas.width, ensembleDistanceCanvas.height, 0, 0, this.ctx_ensemble.canvas.width, this.ctx_ensemble.canvas.height);
    }

}

export let distanceMapPanelConfigurator = (container) => {

    return {
        container,
        panel: $('#spacewalk_distance_map_panel').get(0),
        isHidden: guiManager.isPanelHidden('spacewalk_distance_map_panel')
    };

};

export const getEnsembleAverageDistanceCanvas = ensemble => {

    const traces = Object.values(ensemble);

    console.time(`getEnsembleDistanceMapCanvas. ${ traces.length } traces.`);

    let mapSize = Globals.ensembleManager.maximumSegmentID;

    let counter = new Array(mapSize * mapSize);
    counter.fill(0);

    let average = new Array(mapSize * mapSize);
    average.fill(kDistanceUndefined);

    for (let trace of traces) {

        const { distanceArray } = createDistanceArray(trace);

        // We need to calculate an array of averages where the input data
        // can have missing - kDistanceUndefined - values

        // loop of the distance array
        for (let d = 0; d < distanceArray.length; d++) {

            // ignore missing data values. they do not participate in the average
            if (kDistanceUndefined === distanceArray[ d ]) {
                // do nothing
            } else {

                // keep track of how many samples we have at this array index
                ++counter[ d ];

                if (kDistanceUndefined === average[ d ]) {

                    // If this is the first data value at this array index copy it to average.
                    average[ d ] = distanceArray[ d ];
                } else {

                    // when there is data AND a pre-existing average value at this array index
                    // use an incremental averaging approach.

                    // Incremental averaging: avg_k = avg_k-1 + (distance_k - avg_k-1) / k
                    // https://math.stackexchange.com/questions/106700/incremental-averageing
                    average[ d ] = average[ d ] + (distanceArray[ d ] - average[ d ]) / counter[ d ];
                }

            }
        }

    }

    const maxAverageDistance = Math.max(...average);

    console.timeEnd(`getEnsembleDistanceMapCanvas. ${ traces.length } traces.`);

    return createDistanceCanvas(average, maxAverageDistance);

};

export const getTraceDistanceCanvas = trace => {
    const { distanceArray, maxDistance } = createDistanceArray(trace);
    return createDistanceCanvas(distanceArray, maxDistance);
};

const createDistanceArray = trace => {

    let mapSize = Globals.ensembleManager.maximumSegmentID;

    let distanceArray = new Array(mapSize * mapSize);
    distanceArray.fill(kDistanceUndefined);

    let maxDistance = Number.NEGATIVE_INFINITY;

    let { vertices } = trace.geometry;
    let { segmentList } = trace;
    let { length } = vertices;

    let exclusionSet = new Set();

    for (let i = 0; i < length; i++) {

        const i_segmentIDIndex = segmentList[ i ].segmentID - 1;

        const xy_diagonal = i_segmentIDIndex * mapSize + i_segmentIDIndex;
        distanceArray[ xy_diagonal ] = 0;

        exclusionSet.add(i);

        for (let j = 0; j < length; j++) {

            if (!exclusionSet.has(j)) {

                const distance = vertices[ i ].distanceTo(vertices[ j ]);

                const j_segmentIDIndex = segmentList[ j ].segmentID - 1;

                const ij =  i_segmentIDIndex * mapSize + j_segmentIDIndex;
                const ji =  j_segmentIDIndex * mapSize + i_segmentIDIndex;

                distanceArray[ ij ] = distanceArray[ ji ] = distance;

                maxDistance = Math.max(maxDistance, distance);
            }

        } // for (j)

    }

    return { distanceArray, maxDistance };

};

const createDistanceCanvas = (distances, maximumDistance) => {

    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    ctx.canvas.width = ctx.canvas.height = Globals.ensembleManager.maximumSegmentID;

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
                ctx.fillStyle = Globals.colorMapManager.retrieveRGB255String('juicebox_default', interpolant);
                ctx.fillRect(i, j, 1, 1);
            }

        }

    }

    return canvas;

};

export default DistanceMapPanel;
