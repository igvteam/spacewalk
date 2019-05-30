import {globalEventBus} from "./eventBus.js";
import { makeDraggable } from "./draggable.js";
import { fitToContainer, moveOffScreen, moveOnScreen } from "./utils.js";
import { guiManager } from './gui.js';
import { contactFrequencyDistanceThreshold, getContactFrequencyCanvasWithEnsemble } from './ensembleManager.js';
import { ensembleManager } from './main.js';
import { clamp } from "./math.js";

const maxDistanceThreshold = 4096;

class ContactFrequencyMapPanel {

    constructor ({ container, panel, isHidden, distanceThreshold }) {

        this.container = container;
        this.$panel = $(panel);

        const $canvas = this.$panel.find('canvas');
        const canvas = $canvas.get(0);

        const $canvas_container = $('#spacewalk_contact_frequency_map_panel_container');
        canvas.width = $canvas_container.width();
        canvas.height = $canvas_container.height();

        this.ctx = canvas.getContext('2d');

        this.isHidden = isHidden;

        if (isHidden) {
            moveOffScreen(this);
        } else {
            this.layout();
        }

        this.distanceThreshold = distanceThreshold;

        let $input = this.$panel.find('#spacewalk_contact_frequency_map_adjustment_select_input');
        $input.val(distanceThreshold);

        $input.on('keyup.spacewalk_contact_frequency_map_input', (e) => {

            // enter (return) key pressed
            if (13 === e.keyCode) {
                let number = parseInt( $input.val() );
                this.distanceThreshold = clamp(number, 0, maxDistanceThreshold);
                this.draw(getContactFrequencyCanvasWithEnsemble(ensembleManager.ensemble, this.distanceThreshold));
            }

        });

        let $button_minus = this.$panel.find('#spacewalk_contact_frequency_map_adjustment_select_button_minus');
        let $button_plus = this.$panel.find('#spacewalk_contact_frequency_map_adjustment_select_button_plus');

        $button_minus.on('click.spacewalk_trace_select_button_minus', (e) => {
            this.distanceThreshold = Math.max(this.distanceThreshold - 1, 0);
            $input.val(this.distanceThreshold);
            this.draw(getContactFrequencyCanvasWithEnsemble(ensembleManager.ensemble, this.distanceThreshold));
        });

        $button_plus.on('click.spacewalk_trace_select_button_plus', (e) => {
            this.distanceThreshold = Math.min(this.distanceThreshold + 1, maxDistanceThreshold);
            $input.val(this.distanceThreshold);
            this.draw(getContactFrequencyCanvasWithEnsemble(ensembleManager.ensemble, this.distanceThreshold));
        });


        makeDraggable(panel, this.$panel.find('.spacewalk_card_drag_container').get(0));

        $(window).on('resize.contact_frequency_map_panel', () => { this.onWindowResize(container, panel) });

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

        const left = 0.1 * pw;
        const  top = ch - 1.1 * ph;

        this.$panel.offset( { left, top } );

    }

    draw(contactFrequencyCanvas) {
        this.ctx.drawImage(contactFrequencyCanvas, 0, 0, contactFrequencyCanvas.width, contactFrequencyCanvas.height, 0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
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
