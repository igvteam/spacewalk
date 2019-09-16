import { clamp } from './math.js'
import Panel from "./panel.js";
import {hideSpinner, showSpinner} from "./gui.js";
import { globals } from "./app.js";

let currentNumber = undefined;
class TraceSelectPanel extends Panel {

    constructor({ container, panel, isHidden }) {

        const xFunction = (cw, w) => {
            const multiple = 5/4;
            return (cw - multiple * w);
        };

        const yFunction = (ch, h) => {
            return h * 1.5;
        };

        super({ container, panel, isHidden, xFunction, yFunction });

        this.$header = $('#spacewalk_trace_select_header');

        this.$input = $('#spacewalk_trace_select_input');

        this.$button_minus = $('#spacewalk_trace_select_button_minus');
        this.$button_plus = $('#spacewalk_trace_select_button_plus');

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

        globals.eventBus.subscribe('DidLoadEnsembleFile', this);
        globals.eventBus.subscribe('DidLoadPointCloudFile', this);

    }

    receiveEvent({ type, data }) {

        super.receiveEvent({ type, data });

        if ('DidLoadEnsembleFile' === type) {

            const { initialKey } = data;
            this.configureWithEnsemble({ ensemble: globals.ensembleManager.ensemble, key: initialKey });
            this.presentPanel();

        } else if ('DidLoadPointCloudFile' === type) {

            this.dismissPanel();

        }
    }

    updateStructureKey(value) {
        this.broadcastUpdate( clamp(currentNumber + value, 0, this.howmany - 1) );
    };

    broadcastUpdate(number) {

        currentNumber = number;

        this.$input.val(number);

        const str = number.toString();

        showSpinner();
        window.setTimeout(() => {
            globals.eventBus.post({ type: "DidSelectTrace", data: str });
            hideSpinner();
        }, 0);
    }

    configureWithEnsemble({ ensemble, key }) {

        this.howmany = Object.keys(ensemble).length;
        const str = this.howmany + ' traces';
        this.$header.text(str);

        currentNumber = parseInt(key, 10);
        this.$input.val(currentNumber);

    }

}

export default TraceSelectPanel;
