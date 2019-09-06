import Globals from './globals.js';
import TraceColorRampMaterialProvider from "./traceColorRampMaterialProvider.js";
import PointCloudColorRampMaterialProvider from "./pointCloudColorRampMaterialProvider.js";
import { setMaterialProvider } from './utils.js';
import { guiManager } from './gui.js';
import Panel from './panel.js';

class ColorRampPanel extends Panel {

    constructor({ container, panel, traceColorRampMaterialProvider, pointCloudColorRampMaterialProvider, isHidden }) {

        const xFunction = (cw, w) => {
            const multiple = 5/4;
            return (cw - multiple * w);
        };

        const yFunction = (ch, h) => {
            return (ch - h) / 2;
        };

        super({ container, panel, isHidden, xFunction, yFunction });

        this.traceColorRampMaterialProvider = traceColorRampMaterialProvider;
        this.pointCloudColorRampMaterialProvider = pointCloudColorRampMaterialProvider;

        // header
        this.$header = this.$panel.find('#spacewalk_color_ramp_header');

        // footer
        this.$footer = this.$panel.find('#spacewalk_color_ramp_footer');

        this.$panel.on('click.color-ramp-panel', (event) => {
            event.stopPropagation();
            setMaterialProvider(traceColorRampMaterialProvider);
            Globals.eventBus.post({ type: "DidChangeMaterialProvider" });
        });

        Globals.eventBus.subscribe('DidSelectStructure', this);
        Globals.eventBus.subscribe('DidLoadEnsembleFile', this);
        Globals.eventBus.subscribe('DidLoadPointCloudFile', this);

    }

    receiveEvent({ type, data }) {

        super.receiveEvent({ type, data });

        if ("DidSelectStructure" === type) {

            this.traceColorRampMaterialProvider.repaint();
        } else if ("DidLoadEnsembleFile" === type) {

            this.pointCloudColorRampMaterialProvider.hide();
            this.traceColorRampMaterialProvider.show();

            const { genomicStart, genomicEnd } = data;

            this.$footer.text(Math.round(genomicStart / 1e6) + 'Mb');
            this.$header.text(Math.round(genomicEnd   / 1e6) + 'Mb');

            this.traceColorRampMaterialProvider.repaint();

            this.presentPanel();
        } else if ("DidLoadPointCloudFile" === type) {

            this.traceColorRampMaterialProvider.hide();
            this.pointCloudColorRampMaterialProvider.show();

            const { genomicStart, genomicEnd } = data;

            this.$footer.text(Math.round(genomicStart / 1e6) + 'Mb');
            this.$header.text(Math.round(genomicEnd   / 1e6) + 'Mb');

            this.pointCloudColorRampMaterialProvider.configureWithInterpolantWindowList(Globals.pointCloudManager.getColorRampInterpolantWindowList());

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
            pointCloudColorRampMaterialProvider: new PointCloudColorRampMaterialProvider( { $canvasContainer, highlightColor } ),
            isHidden: guiManager.isPanelHidden('spacewalk_color_ramp_panel')
        };

};

export default ColorRampPanel;
