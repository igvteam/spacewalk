import { globalEventBus } from "./eventBus.js";
import { makeDraggable } from "./draggable.js";
import ColorRampWidget from "./colorRampWidget.js";

class ColorRampPanel {
    constructor({ container, panel, colors, highlightColor }) {

        this.$panel = $(panel);

        this.genomicRampWidget = new ColorRampWidget( { panel, namespace: 'genomicRampWidget', colors, highlightColor } );

        layout(container, panel);

        makeDraggable(panel, $(panel).find('.trace3d_card_drag_container').get(0));

        $(window).on('resize.trace3d.toolpanel', () => {
            this.onWindowResize(container, panel)
        });

        $(panel).on('mouseenter.trace3d.toolpanel', (event) => {
            event.stopPropagation();
            this.genomicRampWidget.repaint();
            globalEventBus.post({type: "DidEnterGUI" });
        });

        $(panel).on('mouseleave.trace3d.toolpanel', (event) => {
            event.stopPropagation();
            globalEventBus.post({type: "DidLeaveGUI" });
        });

        globalEventBus.subscribe("ToggleUIControls", this);
    }

    receiveEvent({ type }) {
        if ("ToggleUIControls" === type) {
            this.$panel.toggle();
        }
    }

    configure({ genomicStart, genomicEnd, structureLength }) {
        this.genomicRampWidget.configure({ genomicStart, genomicEnd, structureLength });
    }

    onWindowResize(container, panel) {
        layout(container, panel);
    };

}

let layout = (container, element) => {

    // const { left, top, right, bottom, x, y, width, height } = container.getBoundingClientRect();
    const { width, height } = container.getBoundingClientRect();
    const domRect = element.getBoundingClientRect();

    const multiple = 5/4;
    $(element).offset( { left: (width - multiple * domRect.width), top: ((height - domRect.height)/2) } );

};

export default ColorRampPanel;
