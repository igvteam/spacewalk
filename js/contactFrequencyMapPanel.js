import KDBush from './kd3d/kd3d.js'
import { clamp } from "./math.js";
import { hideSpinner, showSpinner } from './app.js';
import Panel from "./panel.js";
import { colorMapManager, ensembleManager } from "./app.js";
import {threeJSColorToRGB255} from "./color.js";
import { drawWithSharedUint8ClampedArray } from "./utils.js";
import EnsembleManager from "./ensembleManager.js";
import SpacewalkEventBus from "./spacewalkEventBus.js"

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

            showSpinner();
            window.setTimeout(() => {
                this.updateEnsembleContactFrequencyCanvas(this.ensemble)
                this.updateTraceContactFrequencyCanvas(this.trace)
                this.doUpdateTrace = this.doUpdateEnsemble = undefined
                hideSpinner()
            }, 0)
        })

        this.doUpdateTrace = this.doUpdateEnsemble = undefined

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
                this.updateTraceContactFrequencyCanvas(this.trace)
                this.doUpdateTrace = undefined
            }

        } else if ("DidLoadEnsembleFile" === type) {

            const { ensemble, trace } = data
            this.ensemble = ensemble
            this.trace = trace
            this.doUpdateTrace = this.doUpdateEnsemble = true

            if (false === this.isHidden) {
                console.log('Calc contact map - trace and ensemble')
                this.updateEnsembleContactFrequencyCanvas(this.ensemble)
                this.updateTraceContactFrequencyCanvas(this.trace)
                this.doUpdateTrace = this.doUpdateEnsemble = undefined
            }

        }

        super.receiveEvent({ type, data });

    }

    present() {

        if (true === this.doUpdateEnsemble) {
            console.log('Calc contact map - ensemble')
            this.updateEnsembleContactFrequencyCanvas(this.ensemble)
            this.doUpdateEnsemble = undefined
        }

        if (true === this.doUpdateTrace) {
            console.log('Calc contact map - trace')
            this.updateTraceContactFrequencyCanvas(this.trace)
            this.doUpdateTrace = undefined
        }

        super.present()

    }

    getClassName(){ return 'ContactFrequencyMapPanel' }

    updateEnsembleContactFrequencyCanvas(ensemble) {

        for (let f = 0; f < ensembleManager.sharedMapArray.length; f++) ensembleManager.sharedMapArray[ f ] = 0;

        const traces = Object.values(ensemble);

        const str = `Contact Frequency Map - Update Ensemble Frequency Array. ${ traces.length } traces.`;
        console.time(str);

        for (let trace of traces) {
            updateContactFrequencyArray(trace, this.distanceThreshold);
        }

        console.timeEnd(str);

        paintContactFrequencyCanvas(ensembleManager.sharedMapArray);

        drawWithSharedUint8ClampedArray(this.ctx_ensemble, this.size, ensembleManager.sharedContactFrequencyMapUint8ClampedArray);

    };

    updateTraceContactFrequencyCanvas(trace) {

        for (let f = 0; f < ensembleManager.sharedMapArray.length; f++) ensembleManager.sharedMapArray[ f ] = 0;

        const str = `Contact Frequency Map - Update Trace Frequency Array.`;
        console.time(str);

        updateContactFrequencyArray(trace, this.distanceThreshold);

        console.timeEnd(str);

        paintContactFrequencyCanvas(ensembleManager.sharedMapArray);

        drawWithSharedUint8ClampedArray(this.ctx_trace, this.size, ensembleManager.sharedContactFrequencyMapUint8ClampedArray);

    };
}

const updateContactFrequencyArray = (trace, distanceThreshold) => {

    const mapSize = ensembleManager.maximumSegmentID;

    const vertices = EnsembleManager.getSingleCentroidVerticesWithTrace(trace);

    const exclusionSet = new Set();

    const spatialIndex = new KDBush(kdBushConfiguratorWithTrace(vertices));

    const traceValues = Object.values(trace);

    for (let i = 0; i < vertices.length; i++) {

        const { x, y, z } = vertices[ i ];

        exclusionSet.add(i);
        const { colorRampInterpolantWindow } = traceValues[ i ];

        const i_segmentIndex = colorRampInterpolantWindow.segmentIndex;
        const xy_diagonal = i_segmentIndex * mapSize + i_segmentIndex;

        ensembleManager.sharedMapArray[ xy_diagonal ]++;

        const contact_indices = spatialIndex.within(x, y, z, distanceThreshold).filter(index => !exclusionSet.has(index));

        if (contact_indices.length > 0) {
            for (let j of contact_indices) {

                const { colorRampInterpolantWindow: colorRampInterpolantWindow_j } = traceValues[ j ];

                const j_segmentIndex = colorRampInterpolantWindow_j.segmentIndex;

                const xy = i_segmentIndex * mapSize + j_segmentIndex;
                const yx = j_segmentIndex * mapSize + i_segmentIndex;

                if (xy > ensembleManager.sharedMapArray.length) {
                    console.log('xy is bogus index ' + xy);
                }

                if (yx > ensembleManager.sharedMapArray.length) {
                    console.log('yx is bogus index ' + yx);
                }

                ensembleManager.sharedMapArray[ xy ] += 1;

                ensembleManager.sharedMapArray[ yx ] = ensembleManager.sharedMapArray[ xy ];

            }
        }

    }

};

const paintContactFrequencyCanvas = frequencies => {

    const str = `Contact Frequency Map - Paint Canvas.`;
    console.time(str);

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

        ensembleManager.sharedContactFrequencyMapUint8ClampedArray[i++] = r;
        ensembleManager.sharedContactFrequencyMapUint8ClampedArray[i++] = g;
        ensembleManager.sharedContactFrequencyMapUint8ClampedArray[i++] = b;
        ensembleManager.sharedContactFrequencyMapUint8ClampedArray[i++] = 255;
    }

    console.timeEnd(str);

};

const kdBushConfiguratorWithTrace = vertices => {

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

};

export let contactFrequencyMapPanelConfigurator = ({ container, isHidden }) => {

    return {
        container,
        panel: $('#spacewalk_contact_frequency_map_panel').get(0),
        isHidden,
        distanceThreshold: defaultDistanceThreshold
    };

};

export default ContactFrequencyMapPanel;
