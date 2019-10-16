import KDBush from '../node_modules/kd3d/js/index.js'
import { clamp } from "./math.js";
import { hideSpinner, showSpinner } from './app.js';
import Panel from "./panel.js";
import { guiManager, colorMapManager, ensembleManager } from "./app.js";
import {threeJSColorToRGB255} from "./color";
import { drawWithSharedUint8ClampedArray } from "./utils.js";
import EnsembleManager from "./ensembleManager.js";

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

        let $input = this.$panel.find('#spacewalk_contact_frequency_map_adjustment_select_input');
        $input.val(distanceThreshold);

        let $button = this.$panel.find('#spacewalk_contact_frequency_map__button');
        $button.on('click.spacewalk_contact_frequency_map__button', (e) => {

            const value = $input.val();
            this.distanceThreshold = clamp(parseInt(value, 10), 0, maxDistanceThreshold);

            showSpinner();
            window.setTimeout(() => {
                this.updateEnsembleContactFrequencyCanvas(ensembleManager.ensemble);
                this.updateTraceContactFrequencyCanvas(ensembleManager.currentTrace);
                hideSpinner();
            }, 0);

        });
    }

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

export let contactFrequencyMapPanelConfigurator = (container) => {

    return {
        container,
        panel: $('#spacewalk_contact_frequency_map_panel').get(0),
        isHidden: guiManager.isPanelHidden('spacewalk_contact_frequency_map_panel'),
        distanceThreshold: defaultDistanceThreshold
    };

};

export default ContactFrequencyMapPanel;
