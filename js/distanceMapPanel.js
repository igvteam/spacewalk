import {globalEventBus} from "./eventBus.js";
import { makeDraggable } from "./draggable.js";
import { fitToContainer, moveOffScreen, moveOnScreen } from "./utils.js";
import { guiManager } from './gui.js';

class DistanceMapPanel {

    constructor ({ container, panel, isHidden }) {

        this.container = container;
        this.$panel = $(panel);

        const $canvas = this.$panel.find('canvas');
        const canvas = $canvas.get(0);

        const $canvas_container = $('#spacewalk_distance_map_panel_container');
        canvas.width = $canvas_container.width();
        canvas.height = $canvas_container.height();

        this.ctx = canvas.getContext('2d');

        this.isHidden = isHidden;

        if (isHidden) {
            moveOffScreen(this);
        } else {
            this.layout();
        }

        makeDraggable(panel, this.$panel.find('.spacewalk_card_drag_container').get(0));

        $(window).on('resize.distance_map_panel', () => { this.onWindowResize(container, panel) });

        globalEventBus.subscribe("ToggleUIControl", this);

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

    draw (traceDistanceCanvas) {
        this.ctx.drawImage(traceDistanceCanvas, 0, 0, traceDistanceCanvas.width, traceDistanceCanvas.height, 0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
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
