import Globals from './globals.js';
import { makeDraggable } from "./draggable.js";
import { clamp } from './math.js'
import { moveOffScreen, moveOnScreen } from './utils.js';

let currentStructureKey = undefined;
class TraceSelectPanel {

    constructor({ container, panel, isHidden }) {

        this.container = container;
        this.$panel = $(panel);
        this.isHidden = isHidden;

        this.$header = $('#spacewalk_trace_select_header');

        this.$input = $('#spacewalk_trace_select_input');

        this.$button_minus = $('#spacewalk_trace_select_button_minus');
        this.$button_plus = $('#spacewalk_trace_select_button_plus');

        this.keys = undefined;

        if (isHidden) {
            moveOffScreen(this);
        } else {
            this.layout();
        }

        makeDraggable(panel, $(panel).find('.spacewalk_card_drag_container').get(0));

        $(window).on('resize.trace3d.trace_select', () => { this.onWindowResize(container, panel) });

        $(panel).on('mouseenter.trace3d.trace_select', (event) => {
            event.stopPropagation();
            Globals.eventBus.post({ type: "DidEnterGUI" });
        });

        $(panel).on('mouseleave.trace3d.trace_select', (event) => {
            event.stopPropagation();
            Globals.eventBus.post({ type: "DidLeaveGUI" });
        });

        this.$button_minus.on('click.spacewalk_trace_select_button_minus', (e) => {

            let number = parseInt(currentStructureKey);
            number = clamp(number - 1, 0, (this.keys.length - 1));
            currentStructureKey = number.toString();

            this.$input.val(currentStructureKey);

            Globals.eventBus.post({ type: "DidSelectStructure", data: currentStructureKey });
        });

        this.$button_plus.on('click.spacewalk_trace_select_button_plus', (e) => {

            let number = parseInt(currentStructureKey);
            number = clamp(number + 1, 0, (this.keys.length - 1));
            currentStructureKey = number.toString();

            this.$input.val(currentStructureKey);

            Globals.eventBus.post({ type: "DidSelectStructure", data: currentStructureKey });
        });

        this.$input.on('keyup.spacewalk_trace_select_input', (e) => {

            // enter (return) key pressed
            if (13 === e.keyCode) {

                let number = parseInt( this.$input.val() );
                number = clamp(number, 0, (this.keys.length - 1));

                currentStructureKey = number.toString();
                this.$input.val(currentStructureKey);

                Globals.eventBus.post({ type: "DidSelectStructure", data: currentStructureKey });
            }

        });

        const handleKeyUp = (e) => {

            e.preventDefault();

            const arrowKeyControl =
                {
                    'ArrowLeft': () => { this.updateStructureKey(-1) },
                    'ArrowRight': () => { this.updateStructureKey( 1) },
                };

            if (arrowKeyControl[ e.key ]) {
                arrowKeyControl[ e.key ]();
            }
        };

        $(document).on('keyup.trace_select', handleKeyUp);

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

    updateStructureKey(value) {

        let number = parseInt(currentStructureKey);
        number = clamp(number + value, 0, (this.keys.length - 1));

        currentStructureKey = number.toString();

        this.$input.val(currentStructureKey);

        Globals.eventBus.post({ type: "DidSelectStructure", data: currentStructureKey });
    };

    configure({ ensemble, initialStructureKey }) {

        this.keys = Object.keys(ensemble);
        this.$header.text(this.keys.length + ' traces');

        currentStructureKey = initialStructureKey;
        this.$input.val(currentStructureKey);

    }

    onWindowResize() {
        if (false === this.isHidden) {
            this.layout();
        }
    }

    layout() {

        // const { left, top, right, bottom, x, y, width, height } = container.getBoundingClientRect();
        const { width:c_w, height: c_h } = this.container.getBoundingClientRect();
        const { width: w, height: h } = this.$panel.get(0).getBoundingClientRect();

        const left = w;
        // const left = (c_w - w)/2;

        // const top = 0.5 * c_h;
        const top = c_h - 2 * h;

        this.$panel.offset( { left, top } );
    }

}

export default TraceSelectPanel;
