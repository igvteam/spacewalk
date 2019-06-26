import Globals from './globals.js';
import { makeDraggable } from "./draggable.js";
import { moveOffScreen, moveOnScreen } from "./utils.js";
import { guiManager } from './gui.js';
import { appleCrayonColorRGB255, rgb255String } from "./color.js";

class DistanceMapPanel {

    constructor ({ container, panel, isHidden }) {

        this.container = container;
        this.$panel = $(panel);

        const $canvas_container = this.$panel.find('#spacewalk_distance_map_panel_container');

        let canvas;

        // trace canvas and context
        canvas = $canvas_container.find('#spacewalk_distance_map_canvas_trace').get(0);
        canvas.width = $canvas_container.width();
        canvas.height = $canvas_container.height();

        this.ctx_trace = canvas.getContext('2d');

        // ensemble canvas and context
        canvas = $canvas_container.find('#spacewalk_distance_map_canvas_ensemble').get(0);
        canvas.width = $canvas_container.width();
        canvas.height = $canvas_container.height();

        this.ctx_ensemble = canvas.getContext('2d');

        const { width: w, height: h } = this.ctx_ensemble.canvas;
        this.ctx_ensemble.fillStyle = rgb255String( appleCrayonColorRGB255('honeydew') );
        this.ctx_ensemble.fillRect(0, 0, w, h);


        this.isHidden = isHidden;

        if (isHidden) {
            moveOffScreen(this);
        } else {
            this.layout();
        }

        makeDraggable(panel, this.$panel.find('.spacewalk_card_drag_container').get(0));

        $(window).on('resize.distance_map_panel', () => { this.onWindowResize(container, panel) });

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

        const left = cw - 1.1 * pw;
        const  top = ch - 1.1 * ph;

        this.$panel.offset( { left, top } );

    }

    drawTraceDistanceCanvas(traceDistanceCanvas) {
        this.ctx_trace.drawImage(traceDistanceCanvas, 0, 0, traceDistanceCanvas.width, traceDistanceCanvas.height, 0, 0, this.ctx_trace.canvas.width, this.ctx_trace.canvas.height);
    }

    drawEnsembleDistanceCanvas(ensembleDistanceCanvas) {
        this.ctx_ensemble.drawImage(ensembleDistanceCanvas, 0, 0, ensembleDistanceCanvas.width, ensembleDistanceCanvas.height, 0, 0, this.ctx_ensemble.canvas.width, this.ctx_ensemble.canvas.height);
    }

}

export let distanceMapPanelConfigurator = (container) => {

    return {
            container,
            panel: $('#spacewalk_distance_map_panel').get(0),
            isHidden: guiManager.isPanelHidden('spacewalk_distance_map_panel')
        };

};

export default DistanceMapPanel;
