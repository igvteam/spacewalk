import Panel from "./panel.js";
import { colorMapManager, ensembleManager } from "./app.js";
import { clearCanvasArray, drawWithCanvasArray } from './utils.js';
import { appleCrayonColorRGB255, threeJSColorToRGB255 } from "./color.js";
import SpacewalkEventBus from "./spacewalkEventBus.js"
import {clamp} from './math.js'
import DistanceMapWorker from './distanceMapWorker?worker'
import ContactFrequencyMapWorker from "./contactFrequencyMapWorker?worker"

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

        // this.worker = new Worker('./js/distanceMapWorker.js', { type: 'module' })
        // NOTE: This syntax is specific to ViteJS
        this.worker = new DistanceMapWorker()

        this.worker.addEventListener('message', ({ data }) => {

            document.querySelector('#spacewalk-distance-map-spinner').style.display = 'none'

            if ('trace' === data.traceOrEnsemble) {
                populateDistanceCanvasArray(data.workerDistanceBuffer, ensembleManager.maximumSegmentID, data.maxDistance, colorMapManager.dictionary['juicebox_default'])
                drawWithCanvasArray(this.ctx_trace, this.size, canvasArray)
            } else {
                populateDistanceCanvasArray(data.workerDistanceBuffer, ensembleManager.maximumSegmentID, data.maxDistance, colorMapManager.dictionary['juicebox_default'])
                drawWithCanvasArray(this.ctx_ensemble, this.size, canvasArray)
            }


        }, false)

        SpacewalkEventBus.globalBus.subscribe('DidSelectTrace', this);
        SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this);

    }

    receiveEvent({ type, data }) {

        if ("DidSelectTrace" === type) {

            const { trace } = data
            this.trace = trace

            if (false === this.isHidden) {
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
            this.updateEnsembleAverageDistanceCanvas(ensembleManager.maximumSegmentID, this.ensemble)
            this.doUpdateEnsemble = undefined
        }

        if (true === this.doUpdateTrace) {
            this.updateTraceDistanceCanvas(ensembleManager.maximumSegmentID, this.trace)
            this.doUpdateTrace = undefined
        }

        super.present()

    }

    getClassName(){ return 'DistanceMapPanel' }

    updateTraceDistanceCanvas(maximumSegmentID, trace) {

        document.querySelector('#spacewalk-distance-map-spinner').style.display = 'block'

        const items = Object.values(trace)
            .map(({ xyz, segmentIndex }) => {
                const [ x, y, z ] = xyz
                return { x, y, z, segmentIndex }
            })

        const data =
            {
                traceOrEnsemble: 'trace',
                maximumSegmentID,
                itemsString: JSON.stringify(items),
            }

        this.worker.postMessage(data)

        clearCanvasArray(canvasArray, ensembleManager.maximumSegmentID)
        drawWithCanvasArray(this.ctx_trace, this.size, canvasArray)

    }

    updateEnsembleAverageDistanceCanvas(maximumSegmentID, ensemble){

        document.querySelector('#spacewalk-distance-map-spinner').style.display = 'block'

        const traces = Object.values(ensemble)
        const essentials = traces.map(trace => {
            return Object.values(trace)
                .map(({ xyz, segmentIndex }) => {
                    const [ x, y, z ] = xyz
                    return { x, y, z, segmentIndex }
                })
        })

        const data =
            {
                traceOrEnsemble: 'ensemble',
                maximumSegmentID,
                // traces,
                essentialsString: JSON.stringify(essentials)
            }

        this.worker.postMessage(data)

        clearCanvasArray(ensembleManager.maximumSegmentID)
        drawWithCanvasArray(this.ctx_ensemble, this.size, canvasArray)

    }
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

export function distanceMapPanelConfigurator({ container, isHidden }) {

    return {
        container,
        panel: document.querySelector('#spacewalk_distance_map_panel'),
        isHidden
    };

}

export default DistanceMapPanel;
