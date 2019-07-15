import Globals from './globals.js';
import { makeDraggable } from "./draggable.js";
import { clamp } from './math.js'
import { panelLayout, presentPanel, moveOffScreen, moveOnScreen } from './utils.js';

let currentNumber = undefined;
class TraceSelectPanel {

    constructor({ container, panel, isHidden }) {

        this.container = container;
        this.$panel = $(panel);
        this.isHidden = isHidden;

        this.$header = $('#spacewalk_trace_select_header');

        this.$input = $('#spacewalk_trace_select_input');

        this.$button_minus = $('#spacewalk_trace_select_button_minus');
        this.$button_plus = $('#spacewalk_trace_select_button_plus');

        if (false === this.isHidden) {
            this.layout();
        }

        makeDraggable(panel, this.$panel.find('.spacewalk_card_drag_container').get(0));

        $(window).on('resize.trace_select', () => { this.onWindowResize(container, panel) });

        this.$panel.on('click.trace_select', event => {
            Globals.eventBus.post({ type: "DidSelectPanel", data: this.$panel });
        });

        this.$panel.on('mouseenter.trace_select', (event) => {
            event.stopPropagation();
            Globals.eventBus.post({ type: "DidEnterGUI" });
        });

        this.$panel.on('mouseleave.trace_select', (event) => {
            event.stopPropagation();
            Globals.eventBus.post({ type: "DidLeaveGUI" });
        });

        this.$button_minus.on('click.trace_select_button_minus', (e) => {
            this.broadcastUpdate( clamp(currentNumber - 1, 0, this.howmany - 1) );
        });

        this.$button_plus.on('click.trace_select_button_plus', (e) => {
            this.broadcastUpdate( clamp(currentNumber + 1, 0, this.howmany - 1));
        });

        this.$input.on('keyup.trace_select_input', (e) => {

            // enter (return) key pressed
            if (13 === e.keyCode) {
                this.broadcastUpdate( clamp(parseInt(this.$input.val(), 10), 0, this.howmany - 1) );
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

            if ('DidLoadFile' === type) {
                const { initialKey } = data;
                this.configureWithEnsemble({ ensemble: Globals.ensembleManager.ensemble, key: initialKey });
                presentPanel(this);
            }
        }
    }

    updateStructureKey(value) {
        this.broadcastUpdate( clamp(currentNumber + value, 0, this.howmany - 1) );
    };

    broadcastUpdate(number) {
        currentNumber = number;
        this.$input.val(currentNumber);
        Globals.eventBus.post({ type: "DidSelectStructure", data: currentNumber.toString() });
    }

    configureWithEnsemble({ ensemble, key }) {

        this.howmany = Object.keys(ensemble).length;
        const str = this.howmany + ' traces';
        this.$header.text(str);

        currentNumber = parseInt(key, 10);
        this.$input.val(currentNumber);

    }

    onWindowResize() {
        if (false === this.isHidden) {
            this.layout();
        }
    }

    __layout() {

        // const { left, top, right, bottom, x, y, width, height } = container.getBoundingClientRect();
        const { width:container_width, height: container_height } = this.container.getBoundingClientRect();
        const { width: w, height: h } = this.$panel.get(0).getBoundingClientRect();

        // const left = w;
        const left = (container_width - w)/2;

        // const top = 0.5 * container_height;
        const top = container_height - 2 * h;

        this.$panel.offset( { left, top } );
    }

    layout () {

        const xFunction = (cw, w) => {
            const multiple = 5/4;
            return (cw - multiple * w);
        };

        const yFunction = (ch, h) => {
            return h * 2;
        };

        panelLayout($(this.container), this.$panel, xFunction, yFunction);
    }

}

export default TraceSelectPanel;
