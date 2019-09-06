import KDBush from '../node_modules/kd3d/js/index.js'
import { clamp } from "./math.js";
import { appleCrayonColorRGB255, rgb255String } from "./color.js";
import { hideSpinner, showSpinner, guiManager } from './gui.js';
import Panel from "./panel.js";
import { globals } from "./app.js";

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

            showSpinner();
            window.setTimeout(() => {

                this.updateEnsembleContactFrequencyCanvas(globals.ensembleManager.ensemble);
                this.drawEnsembleContactFrequency();

                this.updateTraceContactFrequencyCanvas(globals.ensembleManager.currentTrace);
                this.drawTraceContactFrequency();

                hideSpinner();
            }, 0);

        });

        // scratch canvas
        this.mapCanvas = document.createElement('canvas');

        // frequencies
        this.frequencies = undefined;

        globals.eventBus.subscribe("DidLoadEnsembleFile", this);

    }

    receiveEvent({ type, data }) {

        super.receiveEvent({ type, data });

        if ('DidLoadEnsembleFile' === type) {

            this.frequencies = new Array(globals.ensembleManager.maximumSegmentID * globals.ensembleManager.maximumSegmentID);

            this.mapCanvas.width = this.mapCanvas.height = globals.ensembleManager.maximumSegmentID;

            this.updateEnsembleContactFrequencyCanvas(globals.ensembleManager.ensemble);
            this.drawEnsembleContactFrequency();

        }
    }

    updateEnsembleContactFrequencyCanvas(ensemble) {

        for (let f = 0; f < this.frequencies.length; f++) this.frequencies[ f ] = 0;

        const ensembleList = Object.values(ensemble);

        const str = `Get ensemble contact frequency canvas. ${ ensembleList.length } traces.`;
        console.time(str);

        for (let trace of ensembleList) {
            this.updateContactFrequencyArray(trace);
        }

        console.timeEnd(str);

        this.updateContactFrequencyCanvas();

    };

    updateTraceContactFrequencyCanvas(trace) {

        for (let f = 0; f < this.frequencies.length; f++) this.frequencies[ f ] = 0;

        this.updateContactFrequencyArray(trace);

        this.updateContactFrequencyCanvas();

    };

    updateContactFrequencyArray(trace){

        let { vertices } = trace.geometry;
        let { segmentList } = trace;
        const exclusionSet = new Set();

        const spatialIndex = new KDBush(kdBushConfiguratorWithTrace(trace));

        const mapSize = globals.ensembleManager.maximumSegmentID;

        for (let i = 0; i < vertices.length; i++) {

            const { x, y, z } = vertices[ i ];

            exclusionSet.add(i);

            const xy_diagonal = (segmentList[ i ].segmentID - 1) * mapSize + (segmentList[ i ].segmentID - 1);
            this.frequencies[ xy_diagonal ]++;

            const contact_indices = spatialIndex.within(x, y, z, this.distanceThreshold).filter(index => !exclusionSet.has(index));

            if (contact_indices.length > 0) {
                for (let contact_i of contact_indices) {

                    const         i_frequency = segmentList[         i ].segmentID - 1;
                    const contact_i_frequency = segmentList[ contact_i ].segmentID - 1;

                    const xy =         i_frequency * mapSize + contact_i_frequency;
                    const yx = contact_i_frequency * mapSize +         i_frequency;

                    if (xy > this.frequencies.length) {
                        console.log('xy is bogus index ' + xy);
                    }

                    if (yx > this.frequencies.length) {
                        console.log('yx is bogus index ' + yx);
                    }

                    this.frequencies[ xy ] += 1;

                    this.frequencies[ yx ] = this.frequencies[ xy ];

                }
            }

        }

    };

    updateContactFrequencyCanvas() {

        let mapSize = globals.ensembleManager.maximumSegmentID;

        let maxFrequency = Number.NEGATIVE_INFINITY;

        const str = `Update contact frequency canvas ${ mapSize } x ${ mapSize }`;
        console.time(str);

        // Calculate max
        for (let m = 0; m < mapSize; m++) {
            const xy = m * mapSize + m;
            const frequency = this.frequencies[ xy ];
            maxFrequency = Math.max(maxFrequency, frequency);
        }

        let ctx = this.mapCanvas.getContext('2d');

        const { width: w, height: h } = ctx.canvas;
        ctx.fillStyle = rgb255String( appleCrayonColorRGB255('magnesium') );
        ctx.fillRect(0, 0, w, h);

        for (let i = 0; i < w; i++) {
            for(let j = 0; j < h; j++) {

                const ij = i * w + j;

                let interpolant;

                if (this.frequencies[ ij ] > maxFrequency) {
                    console.log(`ERROR! At i ${ i } j ${ j } frequencies ${ this.frequencies[ ij ] } should NOT exceed the max ${ maxFrequency }`);
                    interpolant = maxFrequency / maxFrequency;
                } else {
                    interpolant = this.frequencies[ ij ] / maxFrequency;
                }

                ctx.fillStyle = globals.colorMapManager.retrieveRGB255String('juicebox_default', interpolant);
                ctx.fillRect(i, j, 1, 1);
            }
        }

        console.timeEnd(str);

    };

    drawEnsembleContactFrequency() {

        if (this.mapCanvas) {
            this.ctx_ensemble.imageSmoothingEnabled = false;
            this.ctx_ensemble.drawImage(this.mapCanvas, 0, 0, this.mapCanvas.width, this.mapCanvas.height, 0, 0, this.ctx_ensemble.canvas.width, this.ctx_ensemble.canvas.height);
        }
    }

    drawTraceContactFrequency() {

        if (this.mapCanvas) {
            this.ctx_trace.imageSmoothingEnabled = false;
            this.ctx_trace.drawImage(this.mapCanvas, 0, 0, this.mapCanvas.width, this.mapCanvas.height, 0, 0, this.ctx_trace.canvas.width, this.ctx_trace.canvas.height);
        }
    }

}

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

export let contactFrequencyMapPanelConfigurator = (container) => {

    return {
        container,
        panel: $('#spacewalk_contact_frequency_map_panel').get(0),
        isHidden: guiManager.isPanelHidden('spacewalk_contact_frequency_map_panel'),
        distanceThreshold: defaultDistanceThreshold
    };

};

export default ContactFrequencyMapPanel;
