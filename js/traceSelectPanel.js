import Globals from './globals.js';
import { makeDraggable } from "./draggable.js";
import { clamp } from './math.js'
import { moveOffScreen, moveOnScreen } from './utils.js';

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
            this.broadcastUpdate( clamp(currentNumber - 1, 0, this.howmany - 1) );
        });

        this.$button_plus.on('click.spacewalk_trace_select_button_plus', (e) => {
            this.broadcastUpdate( clamp(currentNumber + 1, 0, this.howmany - 1));
        });

        this.$input.on('keyup.spacewalk_trace_select_input', (e) => {

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
        Globals.eventBus.subscribe("DidLoadPointCloudFile", this);
        Globals.eventBus.subscribe("DidLoadFile", this);

    }

    receiveEvent({ type, data }) {

        if ("ToggleUIControl" === type && data && data.payload === this.$panel.attr('id')) {

            if (this.isHidden) {
                moveOnScreen(this);
            } else {
                moveOffScreen(this);
            }
            this.isHidden = !this.isHidden;
        }  else if ('DidLoadPointCloudFile' === type) {
            this.datatype = 'point-cloud';
        } else if ('DidLoadFile' === type) {
            this.datatype = 'traces';
        }
    }

    updateStructureKey(value) {
        this.broadcastUpdate( clamp(currentNumber + value, 0, this.howmany - 1) );
    };

    broadcastUpdate(number) {

        currentNumber = number;
        this.$input.val(currentNumber);

        if ('traces' === this.datatype) {
            Globals.eventBus.post({ type: "DidSelectStructure", data: currentNumber.toString() });
        } else if ('point-cloud' === this.datatype) {
            Globals.eventBus.post({ type: "DidSelectPointCloud", data: currentNumber });
        }

    }

    configureWithPointCloudList({ pointCloudList, index }) {

        this.howmany = pointCloudList.length;
        const str = this.howmany + ' ' + this.datatype;
        this.$header.text(str);

        currentNumber = index;
        this.$input.val(currentNumber);

    }

    configureWithEnsemble({ ensemble, key }) {

        this.howmany = Object.keys(ensemble).length;
        const str = this.howmany + ' ' + this.datatype;
        this.$header.text(str);

        currentNumber = parseInt(key, 10);
        this.$input.val(currentNumber);

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
