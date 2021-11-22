import SpacewalkEventBus from './spacewalkEventBus.js'
import { setMaterialProvider } from './utils.js';
import Panel from './panel.js';
import { colorRampMaterialProvider } from "./app.js";

class ColorRampPanel extends Panel {

    constructor({ container, panel, colorRampMaterialProvider, isHidden }) {

        const xFunction = (cw, w) => {
            const multiple = 5/4;
            return (cw - multiple * w);
        };

        const yFunction = (ch, h) => {
            return (ch - h) / 2;
        };

        super({ container, panel, isHidden, xFunction, yFunction });

        // header
        this.$header = this.$panel.find('#spacewalk_color_ramp_header');

        // footer
        this.$footer = this.$panel.find('#spacewalk_color_ramp_footer');

        SpacewalkEventBus.globalBus.subscribe('DidSelectTrace', this);
        SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this);

    }

    receiveEvent({ type, data }) {

        super.receiveEvent({ type, data });

        if ("DidSelectTrace" === type) {

            colorRampMaterialProvider.repaint();
        } else if ("DidLoadEnsembleFile" === type) {

            const { genomicStart, genomicEnd } = data;

            this.$footer.text(Math.round(genomicStart / 1e6) + 'Mb');
            this.$header.text(Math.round(genomicEnd   / 1e6) + 'Mb');

            colorRampMaterialProvider.repaint();

            this.present();
        }
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
