import KDBush from '../node_modules/kd3d/js/index.js'
import Globals from './globals.js';
import { makeDraggable } from "./draggable.js";
import { presentPanel, moveOffScreen, moveOnScreen } from "./utils.js";
import { guiManager } from './gui.js';
import { clamp } from "./math.js";
import { appleCrayonColorRGB255, rgb255String } from "./color.js";

const maxDistanceThreshold = 4096;
const defaultDistanceThreshold = 256;

class ContactFrequencyMapPanel {

    constructor ({ container, panel, isHidden, distanceThreshold }) {

        this.container = container;
        this.$panel = $(panel);

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

        // test
        // const { width: w, height: h } = this.ctx_trace.canvas;
        // this.ctx_trace.fillStyle = rgb255String( appleCrayonColorRGB255('bubblegum') );
        // this.ctx_trace.fillRect(0, 0, w, h);

        this.isHidden = isHidden;

        if (isHidden) {
            moveOffScreen(this);
        } else {
            this.layout();
        }

        this.distanceThreshold = distanceThreshold;

        let $input = this.$panel.find('#spacewalk_contact_frequency_map_adjustment_select_input');
        $input.val(distanceThreshold);

        let $button = this.$panel.find('#spacewalk_contact_frequency_map__button');
        $button.on('click.spacewalk_contact_frequency_map__button', (e) => {

            const value = $input.val();
            this.distanceThreshold = clamp(parseInt(value, 10), 0, maxDistanceThreshold);

            this.drawEnsembleContactFrequency(getEnsembleContactFrequencyCanvas(Globals.ensembleManager.ensemble, this.distanceThreshold));
            this.drawTraceContactFrequency(getTraceContactFrequencyCanvas(Globals.ensembleManager.currentTrace, this.distanceThreshold));
        });

        makeDraggable(panel, this.$panel.find('.spacewalk_card_drag_container').get(0));

        $(window).on('resize.contact_frequency_map_panel', () => { this.onWindowResize(container, panel) });

        this.$panel.on('click.contact_frequency_map_panel', event => {
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

        const left = 0.1 * pw;
        const  top = ch - 1.1 * ph;

        this.$panel.offset( { left, top } );

    }

    drawEnsembleContactFrequency(ensembleContactFrequencyCanvas) {

        this.ctx_ensemble.imageSmoothingEnabled = false;
        this.ctx_ensemble.drawImage(ensembleContactFrequencyCanvas, 0, 0, ensembleContactFrequencyCanvas.width, ensembleContactFrequencyCanvas.height, 0, 0, this.ctx_ensemble.canvas.width, this.ctx_ensemble.canvas.height);
    }

    drawTraceContactFrequency(traceContactFrequencyCanvas) {

        this.ctx_trace.imageSmoothingEnabled = false;

        this.ctx_trace.drawImage(traceContactFrequencyCanvas, 0, 0, traceContactFrequencyCanvas.width, traceContactFrequencyCanvas.height, 0, 0, this.ctx_trace.canvas.width, this.ctx_trace.canvas.height);
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

export const getEnsembleContactFrequencyCanvas = (ensemble, distanceThreshold) => {

    let mapSize = Globals.ensembleManager.maximumSegmentID;

    let frequencies = new Array(mapSize * mapSize);
    for (let f = 0; f < frequencies.length; f++) frequencies[ f ] = 0;

    const ensembleList = Object.values(ensemble);
    console.time(`getEnsembleContactFrequencyCanvas. ${ ensembleList.length } traces.`);

    for (let trace of ensembleList) {
        updateContactFrequencyArray(trace, frequencies, distanceThreshold);
    }

    console.timeEnd(`getEnsembleContactFrequencyCanvas. ${ ensembleList.length } traces.`);

    return createContactFrequencyCanvas(frequencies);

};

export const getTraceContactFrequencyCanvas = (trace, distanceThreshold) => {

    let mapSize = Globals.ensembleManager.maximumSegmentID;

    let frequencies = new Array(mapSize * mapSize);
    for (let f = 0; f < frequencies.length; f++) frequencies[ f ] = 0;

    updateContactFrequencyArray(trace, frequencies, distanceThreshold);

    return createContactFrequencyCanvas(frequencies);

};

const updateContactFrequencyArray = (trace, frequencies, distanceThreshold) => {

    let { vertices } = trace.geometry;
    let { segmentList } = trace;
    const exclusionSet = new Set();

    const spatialIndex = new KDBush(kdBushConfiguratorWithTrace(trace));

    const mapSize = Globals.ensembleManager.maximumSegmentID;

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

const createContactFrequencyCanvas = frequencies => {

    let mapSize = Globals.ensembleManager.maximumSegmentID;

    console.time(`Create ${ mapSize } x ${ mapSize } contact map`);

    let maxFrequency = Number.NEGATIVE_INFINITY;

    // Calculate max
    for (let m = 0; m < mapSize; m++) {
        const xy = m * mapSize + m;
        const frequency = frequencies[ xy ];
        maxFrequency = Math.max(maxFrequency, frequency);
    }

    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    ctx.canvas.width = ctx.canvas.height = mapSize;

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

    console.timeEnd(`Create ${ mapSize } x ${ mapSize } contact map`);

    return canvas;

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
