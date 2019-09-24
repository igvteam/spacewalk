import TraceColorRampMaterialProvider from "./traceColorRampMaterialProvider.js";
import { setMaterialProvider } from './utils.js';
import { guiManager } from './gui.js';
import Panel from './panel.js';
import { globals } from "./app.js";

class ColorRampPanel extends Panel {

    constructor({ container, panel, traceColorRampMaterialProvider, isHidden }) {

        const xFunction = (cw, w) => {
            const multiple = 5/4;
            return (cw - multiple * w);
        };

        const yFunction = (ch, h) => {
            return (ch - h) / 2;
        };

        super({ container, panel, isHidden, xFunction, yFunction });

        this.traceColorRampMaterialProvider = traceColorRampMaterialProvider;

        // header
        this.$header = this.$panel.find('#spacewalk_color_ramp_header');

        // footer
        this.$footer = this.$panel.find('#spacewalk_color_ramp_footer');

        this.$panel.on('click.color-ramp-panel', (event) => {
            event.stopPropagation();
            setMaterialProvider(traceColorRampMaterialProvider);
            globals.eventBus.post({ type: "DidChangeMaterialProvider" });
        });

        globals.eventBus.subscribe('DidSelectTrace', this);
        globals.eventBus.subscribe('DidLoadEnsembleFile', this);

    }

    receiveEvent({ type, data }) {

        super.receiveEvent({ type, data });

        if ("DidSelectTrace" === type) {

            this.traceColorRampMaterialProvider.repaint();
        } else if ("DidLoadEnsembleFile" === type) {

            const { genomicStart, genomicEnd } = data;

            this.$footer.text(Math.round(genomicStart / 1e6) + 'Mb');
            this.$header.text(Math.round(genomicEnd   / 1e6) + 'Mb');

            this.traceColorRampMaterialProvider.repaint();

            this.presentPanel();
        }
    }

}

export const colorRampPanelConfigurator = ({ container, highlightColor }) => {

    const $canvasContainer = $('#spacewalk_color_ramp_canvas_container');

    return {
            container,
            panel: $('#spacewalk_color_ramp_panel').get(0),
            traceColorRampMaterialProvider: new TraceColorRampMaterialProvider( { $canvasContainer, highlightColor } ),
            isHidden: guiManager.isPanelHidden('spacewalk_color_ramp_panel')
        };

};

export default ColorRampPanel;
