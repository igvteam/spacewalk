import Globals from './globals.js';
import ColorRampMaterialProvider from "./colorRampMaterialProvider.js";
import { makeDraggable } from "./draggable.js";
import { setMaterialProvider, moveOffScreen, moveOnScreen } from './utils.js';
import { guiManager } from './gui.js';

class ColorRampPanel {

    constructor({ container, panel, colorRampMaterialProvider, isHidden }) {

        this.container = container;
        this.$panel = $(panel);
        this.colorRampMaterialProvider = colorRampMaterialProvider;
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
            setMaterialProvider(colorRampMaterialProvider);
            Globals.eventBus.post({ type: "DidChangeMaterialProvider" });
        });

        Globals.eventBus.subscribe("ToggleUIControl", this);
    }

    receiveEvent({ type, data }) {

        if ("ToggleUIControl" === type && data && data.payload === this.$panel.attr('id')) {

            if (true === this.isHidden) {
                moveOnScreen(this);
            } else {
                moveOffScreen(this);
            }

            this.isHidden = !this.isHidden;

        }
    }

    configure({ genomicStart, genomicEnd }) {

        const [ ss, ee ] = [ genomicStart / 1e6, genomicEnd / 1e6 ];
        this.$footer.text(ss + 'Mb');
        this.$header.text(ee + 'Mb');

        this.colorRampMaterialProvider.repaint();
    }

    onWindowResize() {
        if (false === this.isHidden) {
            this.layout();
        }
    }

    layout () {

        // const { left, top, right, bottom, x, y, width, height } = container.getBoundingClientRect();
        const { width: c_w, height: c_h } = this.container.getBoundingClientRect();
        const { width:   w, height:   h } = this.$panel.get(0).getBoundingClientRect();

        const multiple = 5/4;
        const left = (c_w - multiple * w);
        const top = ((c_h - h)/2);

        this.$panel.offset( { left, top } );
    }

}

export const colorRampPanelConfigurator = ({ container, highlightColor }) => {

    const $canvasContainer = $('#spacewalk_color_ramp_canvas_container');

    return {
            container,
            panel: $('#spacewalk_color_ramp_panel').get(0),
            colorRampMaterialProvider: new ColorRampMaterialProvider( { $canvasContainer, namespace: 'color-ramp-material-provider', highlightColor } ),
            isHidden: guiManager.isPanelHidden('spacewalk_color_ramp_panel')
        };

};

export default ColorRampPanel;
