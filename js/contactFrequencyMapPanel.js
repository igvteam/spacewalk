import { clamp } from "./math.js";
import Panel from "./panel.js";
import { colorMapManager, ensembleManager } from "./app.js";
import {threeJSColorToRGB255} from "./color.js";
import {clearCanvasArray, drawWithCanvasArray} from "./utils.js"
import SpacewalkEventBus from "./spacewalkEventBus.js"
import ContactFrequencyMapWorker from './contactFrequencyMapWorker?worker'

let canvasArray = undefined

const maxDistanceThreshold = 4096;
const defaultDistanceThreshold = 256;

class ContactFrequencyMapPanel extends Panel {

    constructor ({ container, panel, isHidden, distanceThreshold }) {

        const xFunction = (cw, w) => {
            return w * 0.1;
        };

        const yFunction = (ch, h) => {
            return ch - (h * 1.1);
        };

        super({ container, panel, isHidden, xFunction, yFunction });

        const $canvas_container = this.$panel.find('#spacewalk_contact_frequency_map_panel_container');

        let canvas;

        // ensemble canvas and context
        canvas = $canvas_container.find('#spacewalk_contact_frequency_map_canvas_ensemble').get(0);
        canvas.width = $canvas_container.width();
        canvas.height = $canvas_container.height();
        this.ctx_ensemble = canvas.getContext('bitmaprenderer');

        // trace canvas and context
        canvas = $canvas_container.find('#spacewalk_contact_frequency_map_canvas_trace').get(0);
        canvas.width = $canvas_container.width();
        canvas.height = $canvas_container.height();
        this.ctx_trace = canvas.getContext('bitmaprenderer');

        this.size = { width: canvas.width, height: canvas.height };

        this.distanceThreshold = distanceThreshold;

        const input = panel.querySelector('#spacewalk_contact_frequency_map_adjustment_select_input')
        input.value = distanceThreshold.toString()

        panel.querySelector('#spacewalk_contact_frequency_map__button').addEventListener('click', () => {

            const value = input.value
            this.distanceThreshold = clamp(parseInt(value, 10), 0, maxDistanceThreshold);

            window.setTimeout(() => {
                this.updateEnsembleContactFrequencyCanvas(ensembleManager.maximumSegmentID, this.ensemble)
                this.updateTraceContactFrequencyCanvas(ensembleManager.maximumSegmentID, this.trace)
                this.doUpdateTrace = this.doUpdateEnsemble = undefined
            }, 0)
        })

        this.doUpdateTrace = this.doUpdateEnsemble = undefined

        // this.worker = new Worker('./js/contactFrequencyMapWorker.js', { type: 'module' })
        this.worker = new ContactFrequencyMapWorker()

        this.worker.addEventListener('message', ({ data }) => {

            document.querySelector('#spacewalk-contact-frequency-map-spinner').style.display = 'none'

            populateContactFrequencyCanvasArray(ensembleManager.maximumSegmentID, data.workerValuesBuffer)
            const context = 'trace' === data.traceOrEnsemble ? this.ctx_trace : this.ctx_ensemble
            drawWithCanvasArray(context, this.size, canvasArray)
        }, false)

        SpacewalkEventBus.globalBus.subscribe('DidSelectTrace', this);
        SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this);

    }

    receiveEvent({ type, data }) {

        if ("DidSelectTrace" === type) {

            const { trace } = data
            this.trace = trace
            this.doUpdateTrace = true

            if (false === this.isHidden) {
                this.updateTraceContactFrequencyCanvas(ensembleManager.maximumSegmentID, this.trace)
                this.doUpdateTrace = undefined
            }

        } else if ("DidLoadEnsembleFile" === type) {

            const { ensemble, trace } = data
            this.ensemble = ensemble
            this.trace = trace
            this.doUpdateTrace = this.doUpdateEnsemble = true

            initializeSharedBuffers(ensembleManager.maximumSegmentID)

            if (false === this.isHidden) {
                this.updateEnsembleContactFrequencyCanvas(ensembleManager.maximumSegmentID, this.ensemble)
                this.updateTraceContactFrequencyCanvas(ensembleManager.maximumSegmentID, this.trace)
                this.doUpdateTrace = this.doUpdateEnsemble = undefined
            }

        }

        super.receiveEvent({ type, data });

    }

    present() {

        if (true === this.doUpdateEnsemble) {
            this.updateEnsembleContactFrequencyCanvas(ensembleManager.maximumSegmentID, this.ensemble)
            this.doUpdateEnsemble = undefined
        }

        if (true === this.doUpdateTrace) {
            this.updateTraceContactFrequencyCanvas(ensembleManager.maximumSegmentID, this.trace)
            this.doUpdateTrace = undefined
        }

        super.present()

    }

    getClassName(){ return 'ContactFrequencyMapPanel' }

    updateTraceContactFrequencyCanvas(maximumSegmentID, trace) {

        document.querySelector('#spacewalk-contact-frequency-map-spinner').style.display = 'block'

        const items = Object.values(trace)
            .map(({ colorRampInterpolantWindow, geometry }) => {
                const [ x, y, z ] = geometry.attributes.position.array
                return { x, y, z, segmentIndex: colorRampInterpolantWindow.segmentIndex }
            })

        const data =
            {
                traceOrEnsemble: 'trace',
                maximumSegmentID,
                itemsString: JSON.stringify(items),
                distanceThreshold: this.distanceThreshold
            }

        this.worker.postMessage(data)

        clearCanvasArray(canvasArray, ensembleManager.maximumSegmentID)
        drawWithCanvasArray(this.ctx_trace, this.size, canvasArray)

    }

    updateEnsembleContactFrequencyCanvas(maximumSegmentID, ensemble) {

        document.querySelector('#spacewalk-contact-frequency-map-spinner').style.display = 'block'

        const traces = Object.values(ensemble)
        const essentials = traces.map(trace => {
            return Object.values(trace)
                .map(({ colorRampInterpolantWindow, geometry }) => {
                    const [ x, y, z ] = geometry.attributes.position.array
                    return { x, y, z, segmentIndex: colorRampInterpolantWindow.segmentIndex }
                })
        })

        const data =
            {
                traceOrEnsemble: 'ensemble',
                maximumSegmentID,
                essentialsString: JSON.stringify(essentials),
                distanceThreshold: this.distanceThreshold
            }

        this.worker.postMessage(data)

        clearCanvasArray(canvasArray, ensembleManager.maximumSegmentID)
        drawWithCanvasArray(this.ctx_ensemble, this.size, canvasArray)

    }
}

function populateContactFrequencyCanvasArray(maximumSegmentID, frequencies) {

    let maxFrequency = Number.NEGATIVE_INFINITY;
    for (let frequency of frequencies) {
        maxFrequency = Math.max(maxFrequency, frequency);
    }

    const colorMap = colorMapManager.dictionary['juicebox_default'];
    const scale = (colorMap.length - 1) / maxFrequency;

    let i = 0;
    for (let frequency of frequencies) {

        const interpolant = Math.floor(frequency * scale);
        const { r, g, b } = threeJSColorToRGB255(colorMap[ interpolant ][ 'threejs' ]);

        canvasArray[i++] = r;
        canvasArray[i++] = g;
        canvasArray[i++] = b;
        canvasArray[i++] = 255;
    }

}

function initializeSharedBuffers(maximumSegmentID) {
    canvasArray = new Uint8ClampedArray(maximumSegmentID * maximumSegmentID * 4)
}

export let contactFrequencyMapPanelConfigurator = ({ container, isHidden }) => {

    return {
        container,
        panel: $('#spacewalk_contact_frequency_map_panel').get(0),
        isHidden,
        distanceThreshold: defaultDistanceThreshold
    };

}

export default ContactFrequencyMapPanel
