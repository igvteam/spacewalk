import KDBush from '../node_modules/kd3d/js/index.js'
import Globals from './globals.js';
import { showSpinner, hideSpinner, guiManager } from './gui.js';
import { clamp } from "./math.js";
import { appleCrayonColorRGB255, rgb255String } from "./color.js";
import Panel from "./panel.js";

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
        this.ctx_ensemble = canvas.getContext('2d');

        // trace canvas and context
        canvas = $canvas_container.find('#spacewalk_contact_frequency_map_canvas_trace').get(0);
        canvas.width = $canvas_container.width();
        canvas.height = $canvas_container.height();
        this.ctx_trace = canvas.getContext('2d');

        this.distanceThreshold = distanceThreshold;

        let $input = this.$panel.find('#spacewalk_contact_frequency_map_adjustment_select_input');
        $input.val(distanceThreshold);

        let $button = this.$panel.find('#spacewalk_contact_frequency_map__button');
        $button.on('click.spacewalk_contact_frequency_map__button', (e) => {

            const value = $input.val();
            this.distanceThreshold = clamp(parseInt(value, 10), 0, maxDistanceThreshold);

            getEnsembleContactFrequencyCanvas(Globals.ensembleManager.ensemble, this.distanceThreshold, this.mapCanvas);
            this.drawEnsembleContactFrequency(this.mapCanvas);

            getTraceContactFrequencyCanvas(Globals.ensembleManager.currentTrace, this.distanceThreshold, this.mapCanvas);
            this.drawTraceContactFrequency(this.mapCanvas);
        });

        // scratch canvas
        this.mapCanvas = document.createElement('canvas');

        Globals.eventBus.subscribe("DidLoadFile", this);

    }

    receiveEvent({ type, data }) {

        super.receiveEvent({ type, data });

        if ('DidLoadFile' === type) {

            this.mapCanvas.width = this.mapCanvas.height = Globals.ensembleManager.maximumSegmentID;

            getEnsembleContactFrequencyCanvas(Globals.ensembleManager.ensemble, this.distanceThreshold, this.mapCanvas);
            this.drawEnsembleContactFrequency(this.mapCanvas);

        }
    }

    drawEnsembleContactFrequency(canvas) {

        if (canvas) {
            this.ctx_ensemble.imageSmoothingEnabled = false;
            this.ctx_ensemble.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, this.ctx_ensemble.canvas.width, this.ctx_ensemble.canvas.height);
        }
    }

    drawTraceContactFrequency(canvas) {

        if (canvas) {
            this.ctx_trace.imageSmoothingEnabled = false;
            this.ctx_trace.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, this.ctx_trace.canvas.width, this.ctx_trace.canvas.height);
        }
    }

}

export let contactFrequencyMapPanelConfigurator = (container) => {

    return {
        container,
        panel: $('#spacewalk_contact_frequency_map_panel').get(0),
        isHidden: guiManager.isPanelHidden('spacewalk_contact_frequency_map_panel'),
        distanceThreshold: defaultDistanceThreshold
    };

};

const getEnsembleContactFrequencyCanvas = (ensemble, distanceThreshold, canvas) => {

    let mapSize = Globals.ensembleManager.maximumSegmentID;

    let frequencies = new Array(mapSize * mapSize);
    for (let f = 0; f < frequencies.length; f++) frequencies[ f ] = 0;

    const ensembleList = Object.values(ensemble);

    const str = `Get ensemble contact frequency canvas. ${ ensembleList.length } traces.`;
    console.time(str);

    for (let trace of ensembleList) {
        updateContactFrequencyArray(trace, frequencies, distanceThreshold);
    }

    console.timeEnd(str);

    setContactFrequencyCanvas(frequencies, canvas);

};

export const getTraceContactFrequencyCanvas = (trace, distanceThreshold, canvas) => {

    let mapSize = Globals.ensembleManager.maximumSegmentID;

    let frequencies = new Array(mapSize * mapSize);
    for (let f = 0; f < frequencies.length; f++) frequencies[ f ] = 0;

    updateContactFrequencyArray(trace, frequencies, distanceThreshold);

    setContactFrequencyCanvas(frequencies, canvas);

};

const updateContactFrequencyArray = (trace, frequencies, distanceThreshold) => {

    const mapSize = Globals.ensembleManager.maximumSegmentID;

    let { vertices } = trace.geometry;
    let { segmentList } = trace;
    const exclusionSet = new Set();

    const spatialIndex = new KDBush(kdBushConfiguratorWithTrace(trace));

    for (let i = 0; i < vertices.length; i++) {

        const { x, y, z } = vertices[ i ];

        exclusionSet.add(i);

        const xy_diagonal = (segmentList[ i ].segmentID - 1) * mapSize + (segmentList[ i ].segmentID - 1);
        frequencies[ xy_diagonal ]++;

        const contact_indices = spatialIndex.within(x, y, z, distanceThreshold).filter(index => !exclusionSet.has(index));

        if (contact_indices.length > 0) {
            for (let contact_i of contact_indices) {

                const         i_frequency = segmentList[         i ].segmentID - 1;
                const contact_i_frequency = segmentList[ contact_i ].segmentID - 1;

                const xy =         i_frequency * mapSize + contact_i_frequency;
                const yx = contact_i_frequency * mapSize +         i_frequency;

                if (xy > frequencies.length) {
                    console.log('xy is bogus index ' + xy);
                }

                if (yx > frequencies.length) {
                    console.log('yx is bogus index ' + yx);
                }

                ++frequencies[ xy ];

                frequencies[ yx ] = frequencies[ xy ];

            }
        }

    }

};

const setContactFrequencyCanvas = (frequencies, canvas) => {

    let mapSize = Globals.ensembleManager.maximumSegmentID;

    let maxFrequency = Number.NEGATIVE_INFINITY;

    const str = `Set contact frequency canvas ${ mapSize } x ${ mapSize }`;
    console.time(str);

    // Calculate max
    for (let m = 0; m < mapSize; m++) {
        const xy = m * mapSize + m;
        const frequency = frequencies[ xy ];
        maxFrequency = Math.max(maxFrequency, frequency);
    }

    let ctx = canvas.getContext('2d');

    const { width: w, height: h } = ctx.canvas;
    ctx.fillStyle = rgb255String( appleCrayonColorRGB255('magnesium') );
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < w; i++) {
        for(let j = 0; j < h; j++) {

            const ij = i * w + j;

            let interpolant;

            if (frequencies[ ij ] > maxFrequency) {
                console.log(`ERROR! At i ${ i } j ${ j } frequencies ${ frequencies[ ij ] } should NOT exceed the max ${ maxFrequency }`);
                interpolant = maxFrequency / maxFrequency;
            } else {
                interpolant = frequencies[ ij ] / maxFrequency;
            }

            ctx.fillStyle = Globals.colorMapManager.retrieveRGB255String('juicebox_default', interpolant);
            ctx.fillRect(i, j, 1, 1);
        }
    }

    console.timeEnd(str);

};

const kdBushConfiguratorWithTrace = trace => {

    return {
        idList: trace.geometry.vertices.map((vertex, index) => index),
        points: trace.geometry.vertices,
        getX: pt => pt.x,
        getY: pt => pt.y,
        getZ: pt => pt.z,
        nodeSize: 64,
        ArrayType: Float64Array,
        axisCount: 3
    }

};

export default ContactFrequencyMapPanel;
