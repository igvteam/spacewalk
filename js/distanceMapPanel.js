import Globals from './globals.js';
import { makeDraggable } from "./draggable.js";
import { moveOffScreen, moveOnScreen } from "./utils.js";
import { guiManager } from './gui.js';
import { appleCrayonColorRGB255, rgb255String } from "./color.js";

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

        Globals.eventBus.subscribe("ToggleUIControl", this);

    }

    receiveEvent({ type, data }) {

        if ("ToggleUIControl" === type && data && data.payload === this.$panel.attr('id')) {

            if (this.isHidden) {
                moveOnScreen(this);
            } else {
                moveOffScreen(this);
            }
            this.isHidden = !this.isHidden;
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

export const getEnsembleAverageDistanceMapCanvas = ensemble => {

    const ensembleList = Object.values(ensemble);

    console.time(`getEnsembleDistanceMapCanvas. ${ ensembleList.length } traces.`);

    let mapSize = Globals.ensembleManager.maximumSegmentID;

    let averageDistanceArray = new Array(mapSize * mapSize);
    let previous = undefined;
    for (let d = 0; d < averageDistanceArray.length; d++) averageDistanceArray[ d ] = 0.0;

    for (let t = 0; t < ensembleList.length; t++) {

        const { distanceArray } = createDistanceArray(ensembleList[ t ]);

        if (undefined === previous) {

            previous = new Array(mapSize * mapSize);
            for (let a = 0; a < previous.length; a++) {
                previous[ a ] = distanceArray[ a ];
            }

        } else {
            for (let d = 0; d < distanceArray.length; d++) {

                if (-1 === distanceArray[ d ]) {
                    // do nothing
                } else {
                    averageDistanceArray[ d ] = previous[ d ] + (distanceArray[ d ] - previous[ d ]) / (t + 1);
                    previous[ d ] = averageDistanceArray[ d ];
                }
            }

            previous = undefined;
        }
    }

    let minAverageDistance = Number.POSITIVE_INFINITY;
    let maxAverageDistance = Number.NEGATIVE_INFINITY;
    for (let averageDistance of averageDistanceArray) {
        minAverageDistance = Math.min(minAverageDistance, averageDistance);
        maxAverageDistance = Math.max(maxAverageDistance, averageDistance);
    }

    console.timeEnd(`getEnsembleDistanceMapCanvas. ${ ensembleList.length } traces.`);

    return createAverageDistanceMap(averageDistanceArray, minAverageDistance, maxAverageDistance);

};

export const getTraceDistanceMapCanvas = trace => {

    const { distanceArray, minDistance, maxDistance } = createDistanceArray(trace);

    return createAverageDistanceMap(distanceArray, minDistance, maxDistance);

};

const createDistanceArray = trace => {

    let mapSize = Globals.ensembleManager.maximumSegmentID;

    let distanceArray = new Array(mapSize * mapSize);
    for (let d = 0; d < distanceArray.length; d++) distanceArray[ d ] = -1;

    let maxDistance = Number.NEGATIVE_INFINITY;
    let minDistance = Number.POSITIVE_INFINITY;

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
                minDistance = Math.min(minDistance, distance);

            }

        } // for (j)

    }

    return { distanceArray, minDistance, maxDistance };

};

const createAverageDistanceMap = (averageDistances, minAverageDistance, maxAverageDistance) => {

    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    ctx.canvas.width = ctx.canvas.height = Globals.ensembleManager.maximumSegmentID;

    const { width: w, height: h } = ctx.canvas;
    ctx.fillStyle = rgb255String( appleCrayonColorRGB255('magnesium') );
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < w; i++) {
        for(let j = 0; j < h; j++) {

            const ij = i * w + j;

            if (-1 === averageDistances[ ij ]) {
                // do nothing
            } else {
                const interpolant = 1.0 - averageDistances[ ij ] / maxAverageDistance;
                ctx.fillStyle = Globals.colorMapManager.retrieveRGB255String('juicebox_default', interpolant);
                ctx.fillRect(i, j, 1, 1);
            }

        }

    }

    return canvas;

};

export default DistanceMapPanel;
