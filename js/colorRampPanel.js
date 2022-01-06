import SpacewalkEventBus from './spacewalkEventBus.js'
import Panel from './panel.js';
import { setMaterialProvider } from './utils.js';
import { ensembleManager, colorRampMaterialProvider, hideSpinner, showSpinner } from "./app.js";
import { clamp } from './math.js'

let currentNumber = undefined;

class ColorRampPanel extends Panel {

    constructor({ container, panel, colorRampMaterialProvider, isHidden }) {

        const xFunction = (cw, w) => {
            const multiple = 5/4;
            return (cw - multiple * w);
        };

        const yFunction = (ch, h) => {
            return (ch - h) / 2;
        };

        super({ container, panel, isHidden, xFunction, yFunction })

        this.howmany = undefined

        // ::::::::::::::::::::::::::::::::: color-amp :::::::::::::::::::::::::::::::::
        this.$header = this.$panel.find('#spacewalk_color_ramp_header');
        this.$footer = this.$panel.find('#spacewalk_color_ramp_footer');

        // ::::::::::::::::::::::::::::::::: trace-select :::::::::::::::::::::::::::::::::
        this.$trace_select_header = $('#spacewalk_trace_select_header');

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




        SpacewalkEventBus.globalBus.subscribe('DidSelectTrace', this);
        SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this);

    }

    getClassName(){ return 'ColorRampPanel' }

    receiveEvent({ type, data }) {

        super.receiveEvent({ type, data });

        if ("DidSelectTrace" === type) {

            colorRampMaterialProvider.repaint();
        } else if ("DidLoadEnsembleFile" === type) {

            const { initialKey, genomicStart, genomicEnd } = data;


            // update color-ramp
            this.$footer.text(Math.round(genomicStart / 1e6) + 'Mb');
            this.$header.text(Math.round(genomicEnd   / 1e6) + 'Mb');

            colorRampMaterialProvider.repaint();


            // update trace-select
            this.howmany = Object.keys(ensembleManager.ensemble).length
            this.$trace_select_header.text(`${ this.howmany } traces`)

            currentNumber = parseInt(initialKey, 10)
            this.$input.val(currentNumber)


            this.present();
        }
    }

    broadcastUpdate(number) {

        currentNumber = number;

        this.$input.val(number);

        const key = number.toString();

        showSpinner();
        window.setTimeout(() => {

            const trace = ensembleManager.getTraceWithName(key);
            ensembleManager.currentTrace = trace;
            SpacewalkEventBus.globalBus.post({ type: "DidSelectTrace", data: { trace } });

            hideSpinner();
        }, 0);
    }
}

export const colorRampPanelConfigurator = ({ container, isHidden }) => {

    return {
            container,
            panel: $('#spacewalk_color_ramp_panel').get(0),
            colorRampMaterialProvider,
            isHidden
        };

};

export default ColorRampPanel;
