import Globals from './globals.js';
import TraceColorRampMaterialProvider from "./traceColorRampMaterialProvider.js";
import PointCloudColorRampMaterialProvider from "./pointCloudColorRampMaterialProvider.js";
import { makeDraggable } from "./draggable.js";
import { panelLayout, presentPanel, setMaterialProvider, moveOffScreen, moveOnScreen } from './utils.js';
import { guiManager } from './gui.js';

class ColorRampPanel {

    constructor({ container, panel, traceColorRampMaterialProvider, pointCloudColorRampMaterialProvider, isHidden }) {

        this.container = container;
        this.$panel = $(panel);
        this.traceColorRampMaterialProvider = traceColorRampMaterialProvider;
        this.pointCloudColorRampMaterialProvider = pointCloudColorRampMaterialProvider;
        this.isHidden = isHidden;

        // header
        this.$header = this.$panel.find('#spacewalk_color_ramp_header');

        // footer
        this.$footer = this.$panel.find('#spacewalk_color_ramp_footer');

        if (isHidden) {
            moveOffScreen(this);
        } else {
            this.layout();
        }

        makeDraggable(panel, this.$panel.find('.spacewalk_card_drag_container').get(0));

        $(window).on('resize.color-ramp-panel', () => {
            this.onWindowResize();
        });

        this.$panel.on('mouseenter.color-ramp-panel', (event) => {
            event.stopPropagation();
            Globals.eventBus.post({type: "DidEnterGUI" });
        });

        this.$panel.on('mouseleave.color-ramp-panel', (event) => {
            event.stopPropagation();
            Globals.eventBus.post({ type: "DidLeaveGUI" });
        });

        this.$panel.on('click.color-ramp-panel', (event) => {
            event.stopPropagation();
            setMaterialProvider(traceColorRampMaterialProvider);
            Globals.eventBus.post({ type: "DidChangeMaterialProvider" });
            Globals.eventBus.post({ type: "DidSelectPanel", data: this.$panel });
        });

        Globals.eventBus.subscribe("ToggleUIControl", this);
        Globals.eventBus.subscribe('DidSelectStructure', this);
        Globals.eventBus.subscribe('DidLoadFile', this);
        Globals.eventBus.subscribe('DidLoadPointCloudFile', this);

    }

    receiveEvent({ type, data }) {

        if ("ToggleUIControl" === type && data && data.payload === this.$panel.attr('id')) {

            if (true === this.isHidden) {
                moveOnScreen(this);
            } else {
                moveOffScreen(this);
            }

            this.isHidden = !this.isHidden;

        } else if ("DidSelectStructure" === type) {

            this.traceColorRampMaterialProvider.repaint();
        } else if ("DidLoadFile" === type) {

            this.pointCloudColorRampMaterialProvider.hide();
            this.traceColorRampMaterialProvider.show();

            const { genomicStart, genomicEnd } = data;

            this.$footer.text(Math.round(genomicStart / 1e6) + 'Mb');
            this.$header.text(Math.round(genomicEnd   / 1e6) + 'Mb');

            this.traceColorRampMaterialProvider.repaint();

            presentPanel(this);
        } else if ("DidLoadPointCloudFile" === type) {

            this.traceColorRampMaterialProvider.hide();
            this.pointCloudColorRampMaterialProvider.show();

            const { genomicStart, genomicEnd } = data;

            this.$footer.text(Math.round(genomicStart / 1e6) + 'Mb');
            this.$header.text(Math.round(genomicEnd   / 1e6) + 'Mb');

            this.pointCloudColorRampMaterialProvider.configureWithInterpolantWindowList(Globals.pointCloudManager.getColorRampInterpolantWindowList());

            presentPanel(this);
        }
    }

    onWindowResize() {
        if (false === this.isHidden) {
            this.layout();
        }
    }

    layout () {

        const xFunction = (cw, w) => {
            const multiple = 5/4;
            return (cw - multiple * w);
        };

        const yFunction = (ch, h) => {
            return (ch - h) / 2;
        };

        panelLayout($(this.container), this.$panel, xFunction, yFunction);
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
