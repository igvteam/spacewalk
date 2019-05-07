import { globalEventBus } from "./eventBus.js";

import { guiManager } from "./main.js";

import ColorRampMaterialProvider from "./colorRampMaterialProvider.js";
import ColorMapManager from "./colorMapManager.js";

import { makeDraggable } from "./draggable.js";
import { moveOffScreen, moveOnScreen } from './utils.js';

class ColorRampPanel {

    constructor({ container, panel, colorRampMaterialProvider, isHidden }) {

        this.container = container;
        this.$panel = $(panel);
        this.colorRampMaterialProvider = colorRampMaterialProvider;
        this.isHidden = isHidden;

        // header
        this.$header = this.$panel.find('#trace3d_color_ramp_header');

        // footer
        this.$footer = this.$panel.find('#trace3d_color_ramp_footer');

        if (isHidden) {
            moveOffScreen(this);
        } else {
            this.layout();
        }

        makeDraggable(panel, this.$panel.find('.trace3d_card_drag_container').get(0));

        $(window).on('resize.trace3d.toolpanel', () => {
            this.onWindowResize();
        });

        this.$panel.on('mouseenter.trace3d.toolpanel', (event) => {
            event.stopPropagation();
            globalEventBus.post({type: "DidEnterGUI" });
        });

        this.$panel.on('mouseleave.trace3d.toolpanel', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidLeaveGUI" });
        });

        globalEventBus.subscribe("ToggleUIControl", this);
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

    configure({ genomicStart, genomicEnd, structureLength }) {

        const [ ss, ee ] = [ genomicStart / 1e6, genomicEnd / 1e6 ];
        this.$footer.text(ss + 'Mb');
        this.$header.text(ee + 'Mb');

        this.colorRampMaterialProvider.configure({structureLength});
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

    let colorMapManager = new ColorMapManager();

    const colormaps =
        {
            peter_kovesi_rainbow_bgyr_35_85_c72_n256: 'resources/colormaps/peter_kovesi/CET-R2.csv'
        };

    for (let key of Object.keys(colormaps)) {
        colorMapManager.addMap({name: key, path: colormaps[key]});
    }

    const $canvasContainer = $('#trace3d_color_ramp_canvas_container');

    return {
            container,
            panel: $('#trace3d_color_ramp_panel').get(0),
            colorRampMaterialProvider: new ColorRampMaterialProvider( { $canvasContainer, namespace: 'colorRampMaterialProvider', colorMapManager, highlightColor } ),
            isHidden: guiManager.isPanelHidden('trace3d_color_ramp_panel')
        };

};

export default ColorRampPanel;
