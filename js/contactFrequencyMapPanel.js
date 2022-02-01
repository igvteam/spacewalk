import KDBush from './kd3d/kd3d.js'
import { clamp } from "./math.js";
import Panel from "./panel.js";
import { colorMapManager, ensembleManager } from "./app.js";
import {threeJSColorToRGB255} from "./color.js";
import { drawWithCanvasArray } from "./utils.js";
import { getSingleCentroidVerticesWithTrace } from "./ensembleManager.js";
import SpacewalkEventBus from "./spacewalkEventBus.js"

const sharedBuffers =
    {
        values: undefined,
        canvasArray: undefined
    }

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

        this.worker = new Worker('./js/contactFrequencyMapWorker.js', { type: 'module' })

        this.worker.addEventListener('message', () => {
            console.log('Message received from contactFrequencyMapWorker')
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
                console.log('Calc contact map - trace')
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
                console.log('Calc contact map - trace and ensemble')
                this.updateEnsembleContactFrequencyCanvas(ensembleManager.maximumSegmentID, this.ensemble)
                this.updateTraceContactFrequencyCanvas(ensembleManager.maximumSegmentID, this.trace)
                this.doUpdateTrace = this.doUpdateEnsemble = undefined
            }

        }

        super.receiveEvent({ type, data });

    }

    present() {

        if (true === this.doUpdateEnsemble) {
            console.log('Calc contact map - ensemble')
            this.updateEnsembleContactFrequencyCanvas(ensembleManager.maximumSegmentID, this.ensemble)
            this.doUpdateEnsemble = undefined
        }

        if (true === this.doUpdateTrace) {
            console.log('Calc contact map - trace')
            this.updateTraceContactFrequencyCanvas(ensembleManager.maximumSegmentID, this.trace)
            this.doUpdateTrace = undefined
        }

        super.present()

    }

    getClassName(){ return 'ContactFrequencyMapPanel' }

    updateEnsembleContactFrequencyCanvas(maximumSegmentID, ensemble) {

        const traces = Object.values(ensemble)

        sharedBuffers.values.fill(0)
        for (let trace of traces) {
            const vertices = getSingleCentroidVerticesWithTrace(trace)
            const spatialIndex = new KDBush(kdBushConfiguratorWithTrace(vertices))
            updateTraceContactFrequencyArray(sharedBuffers.values, spatialIndex, maximumSegmentID, trace, vertices, this.distanceThreshold)
        }

        populateContactFrequencyCanvasArray(maximumSegmentID, sharedBuffers.values)
        drawWithCanvasArray(this.ctx_ensemble, this.size, sharedBuffers.canvasArray)
    }

    updateTraceContactFrequencyCanvas(maximumSegmentID, trace) {

        sharedBuffers.values.fill(0)

        const vertices = getSingleCentroidVerticesWithTrace(trace)
        const spatialIndex = new KDBush(kdBushConfiguratorWithTrace(vertices))
        updateTraceContactFrequencyArray(sharedBuffers.values, spatialIndex, maximumSegmentID, trace, vertices, this.distanceThreshold)

        populateContactFrequencyCanvasArray(maximumSegmentID, sharedBuffers.values);
        drawWithCanvasArray(this.ctx_trace, this.size, sharedBuffers.canvasArray);
    }
}

function updateTraceContactFrequencyArray(values, spatialIndex, maximumSegmentID, trace, vertices, distanceThreshold) {

    const exclusionSet = new Set();

    const traceValues = Object.values(trace)

    for (let i = 0; i < vertices.length; i++) {

        const { x, y, z } = vertices[ i ];

        exclusionSet.add(i);
        const { colorRampInterpolantWindow } = traceValues[ i ];

        const i_segmentIndex = colorRampInterpolantWindow.segmentIndex;
        const xy_diagonal = i_segmentIndex * maximumSegmentID + i_segmentIndex;

        values[ xy_diagonal ]++;

        const contact_indices = spatialIndex.within(x, y, z, distanceThreshold).filter(index => !exclusionSet.has(index));

        if (contact_indices.length > 0) {
            for (let j of contact_indices) {

                const { colorRampInterpolantWindow: colorRampInterpolantWindow_j } = traceValues[ j ];

                const j_segmentIndex = colorRampInterpolantWindow_j.segmentIndex;

                const xy = i_segmentIndex * maximumSegmentID + j_segmentIndex;
                const yx = j_segmentIndex * maximumSegmentID + i_segmentIndex;

                if (xy > values.length) {
                    console.log('xy is bogus index ' + xy);
                }

                if (yx > values.length) {
                    console.log('yx is bogus index ' + yx);
                }

                values[ xy ] += 1;

                values[ yx ] = values[ xy ];

            }
        }

    }

}

function updateEnsembleContactFrequencyArray(maximumSegmentID, ensemble) {

    const traces = Object.values(ensemble)

    sharedBuffers.values.fill(0)
    for (let trace of traces) {

        const vertices = getSingleCentroidVerticesWithTrace(trace)
        const spatialIndex = new KDBush(kdBushConfiguratorWithTrace(vertices))

        updateTraceContactFrequencyArray(sharedBuffers.values, spatialIndex, maximumSegmentID, trace, vertices, this.distanceThreshold)
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

        sharedBuffers.canvasArray[i++] = r;
        sharedBuffers.canvasArray[i++] = g;
        sharedBuffers.canvasArray[i++] = b;
        sharedBuffers.canvasArray[i++] = 255;
    }

}

function initializeSharedBuffers(maximumSegmentID) {
    sharedBuffers.values = new Array(maximumSegmentID * maximumSegmentID)
    sharedBuffers.canvasArray = new Uint8ClampedArray(maximumSegmentID * maximumSegmentID * 4)
}

function kdBushConfiguratorWithTrace(vertices) {

    return {
        idList: vertices.map((vertex, index) => index),
        points: vertices,
        getX: pt => pt.x,
        getY: pt => pt.y,
        getZ: pt => pt.z,
        nodeSize: 64,
        ArrayType: Float64Array,
        axisCount: 3
    }

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
