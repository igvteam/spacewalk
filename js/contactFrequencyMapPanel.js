import Globals from './globals.js';
import { makeDraggable } from "./draggable.js";
import { moveOffScreen, moveOnScreen } from "./utils.js";
import { guiManager } from './gui.js';
import { contactFrequencyDistanceThreshold, getEnsembleContactFrequencyCanvas, getTraceContactFrequencyCanvas } from './ensembleManager.js';
import { clamp } from "./math.js";

const maxDistanceThreshold = 4096;

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
            this.drawEnsembleContactFrequency(getEnsembleContactFrequencyCanvas(Globals.ensembleManager.ensemble));
            this.drawTraceContactFrequency(getTraceContactFrequencyCanvas(Globals.ensembleManager.currentTrace, this.distanceThreshold));
        });


        makeDraggable(panel, this.$panel.find('.spacewalk_card_drag_container').get(0));

        $(window).on('resize.contact_frequency_map_panel', () => { this.onWindowResize(container, panel) });

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
            distanceThreshold: contactFrequencyDistanceThreshold
        };

};

export default ContactFrequencyMapPanel;
