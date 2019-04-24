import { globalEventBus } from "./eventBus.js";
import { makeDraggable } from "./draggable.js";
import ColorRampWidget from "./colorRampWidget.js";
import { moveOffScreen, moveOnScreen } from './utils.js';
import { sceneManager } from "./main.js";

class ColorRampPanel {

    constructor({ container, panel, colorMapManager, highlightColor, isHidden }) {

        this.container = container;
        this.$panel = $(panel);
        this.isHidden = isHidden;

        this.colorRampWidget = new ColorRampWidget( { panel, namespace: 'colorRampWidget', colorMapManager, highlightColor } );

        if (isHidden) {
            moveOffScreen(this);
        } else {
            this.layout();
        }

        makeDraggable(panel, $(panel).find('.trace3d_card_drag_container').get(0));

        $(window).on('resize.trace3d.toolpanel', () => {
            this.onWindowResize();
        });

        $(panel).on('mouseenter.trace3d.toolpanel', (event) => {
            event.stopPropagation();
            globalEventBus.post({type: "DidEnterGUI" });
        });

        $(panel).on('mouseleave.trace3d.toolpanel', (event) => {
            event.stopPropagation();
            globalEventBus.post({type: "DidLeaveGUI", });
        });

        globalEventBus.subscribe("ToggleUIControl", this);
        globalEventBus.subscribe("DidLeaveGUI", this);
    }

    receiveEvent({ type, data }) {

        if ("ToggleUIControl" === type && data && data.payload === this.$panel.attr('id')) {

            if (true === this.isHidden) {
                moveOnScreen(this);
            } else {
                moveOffScreen(this);
            }

            this.isHidden = !this.isHidden;

        } else if (sceneManager && "DidLeaveGUI" === type) {
            this.colorRampWidget.repaint();
        }
    }

    configure({ genomicStart, genomicEnd, structureLength }) {
        this.colorRampWidget.configure({ genomicStart, genomicEnd, structureLength });
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

export default ColorRampPanel;
