import EnsembleManager from './ensembleManager.js'
import { colorMapManager, ensembleManager } from "./app.js";
import { clamp } from "./math.js";
import Panel from "./panel.js";
import { appleCrayonColorRGB255, threeJSColorToRGB255 } from "./color.js";
import {clearCanvasArray, renderArrayToCanvas} from "./utils.js"
import SpacewalkEventBus from "./spacewalkEventBus.js"

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

        this.ctx_ensemble = canvas.getContext('bitmaprenderer');

        this.doUpdateTrace = this.doUpdateEnsemble = undefined

        this.worker = new Worker(new URL('./distanceMapWorker.js', import.meta.url), { type: 'module' })

        this.worker.addEventListener('message', ({ data }) => {

            document.querySelector('#spacewalk-distance-map-spinner').style.display = 'none'

            const traceLength = ensembleManager.getTraceLength()

            if (undefined === canvasArray) {
                canvasArray = new Uint8ClampedArray(traceLength * traceLength * 4)
            }

            clearCanvasArray(canvasArray, traceLength)

            if ('trace' === data.traceOrEnsemble) {
                populateCanvasArray(canvasArray, data.workerDistanceBuffer, data.maxDistance, colorMapManager.dictionary['juicebox_default'])
                renderArrayToCanvas(this.ctx_trace, canvasArray)
            } else {
                populateCanvasArray(canvasArray, data.workerDistanceBuffer, data.maxDistance, colorMapManager.dictionary['juicebox_default'])
                renderArrayToCanvas(this.ctx_ensemble, canvasArray)
            }


        }, false)

        SpacewalkEventBus.globalBus.subscribe('DidSelectTrace', this);
        SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this);

    }

    receiveEvent({ type, data }) {

        if ("DidSelectTrace" === type) {

            if (false === this.isHidden) {
                const { trace } = data
                this.updateTraceDistanceCanvas(ensembleManager.getTraceLength(), trace)
                this.doUpdateTrace = undefined
            } else {
                this.doUpdateTrace = true
            }

        } else if ("DidLoadEnsembleFile" === type) {

            canvasArray = undefined
            this.doUpdateTrace = this.doUpdateEnsemble = true

            if (false === this.isHidden) {
                this.updateEnsembleAverageDistanceCanvas(ensembleManager.getTraceLength(), ensembleManager.getLiveContactFrequencyMapVertexLists())
                const { trace } = data
                this.updateTraceDistanceCanvas(ensembleManager.getTraceLength(), trace)
                this.doUpdateTrace = this.doUpdateEnsemble = undefined
            }

        }

        super.receiveEvent({ type, data });
    }

    present() {

        if (true === this.doUpdateEnsemble) {
            this.updateEnsembleAverageDistanceCanvas(ensembleManager.getTraceLength(), ensembleManager.getLiveContactFrequencyMapVertexLists())
            this.doUpdateEnsemble = undefined
        }

        if (true === this.doUpdateTrace) {
            this.updateTraceDistanceCanvas(ensembleManager.getTraceLength(), ensembleManager.currentTrace)
            this.doUpdateTrace = undefined
        }

        super.present()

    }

    getClassName(){ return 'DistanceMapPanel' }

    updateTraceDistanceCanvas(traceLength, trace) {

        document.querySelector('#spacewalk-distance-map-spinner').style.display = 'block'

        const vertices = ensembleManager.getEnsembleTraceVertices(trace)

        const data =
            {
                traceOrEnsemble: 'trace',
                traceLength,
                verticesString: JSON.stringify(vertices),
            }

        this.worker.postMessage(data)

    }

    updateEnsembleAverageDistanceCanvas(traceLength, vertexLists){

        document.querySelector('#spacewalk-distance-map-spinner').style.display = 'block'

        const data =
            {
                traceOrEnsemble: 'ensemble',
                traceLength,
                vertexListsString: JSON.stringify(vertexLists)
            }

        this.worker.postMessage(data)

    }
}

function populateCanvasArray(array, distances, maximumDistance, colorMap) {

    let i = 0;
    const { r, g, b } = appleCrayonColorRGB255('magnesium');
    for (let x = 0; x < distances.length; x++) {
        array[i++] = r;
        array[i++] = g;
        array[i++] = b;
        array[i++] = 255;
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

            const floorInterpolantScaled = Math.floor(interpolantScaled)
            const result = colorMap[ floorInterpolantScaled ][ 'threejs' ]
            const { r, g, b } = threeJSColorToRGB255(result)

            array[i] = r;
            array[i + 1] = g;
            array[i + 2] = b;
            array[i + 3] = 255;
        }

        i += 4;
    }

}
export function distanceMapPanelConfigurator({ container, isHidden }) {

    return {
        container,
        panel: document.querySelector('#spacewalk_distance_map_panel'),
        isHidden
    };

}

export default DistanceMapPanel;
