import { globalEventBus } from "./eventBus.js";
import { makeDraggable } from "./draggable.js";
import ColorRampWidget from "./colorRampWidget.js";

class ColorRampPanel {

    constructor({ container, panel, colorTableManager, highlightColor }) {

        this.$panel = $(panel);

        this.genomicRampWidget = new ColorRampWidget( { panel, namespace: 'genomicRampWidget', colorTableManager, highlightColor } );

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
    const { width: c_w, height: c_h } = container.getBoundingClientRect();
    const { width:   w, height:   h } = element.getBoundingClientRect();

    const multiple = 5/4;
    const left = (c_w - multiple * w);
    const top = ((c_h - h)/2);
    $(element).offset( { left, top } );

};

export default ColorRampPanel;
