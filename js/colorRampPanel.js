import { globalEventBus } from "./eventBus.js";
import { makeDraggable } from "./draggable.js";
import ColorRampWidget from "./colorRampWidget.js";

let isHidden = true;
class ColorRampPanel {

    constructor({ container, panel, colorMapManager, highlightColor }) {

        this.container = container;
        this.$panel = $(panel);

        this.colorRampWidget = new ColorRampWidget( { panel, namespace: 'colorRampWidget', colorMapManager, highlightColor } );

        layout(container, panel);

        makeDraggable(panel, $(panel).find('.trace3d_card_drag_container').get(0));

        $(window).on('resize.trace3d.toolpanel', () => {
            this.onWindowResize(container, panel)
        });

        $(panel).on('mouseenter.trace3d.toolpanel', (event) => {
            event.stopPropagation();
            this.colorRampWidget.repaint();
            globalEventBus.post({type: "DidEnterGUI" });
        });

        $(panel).on('mouseleave.trace3d.toolpanel', (event) => {
            event.stopPropagation();
            globalEventBus.post({type: "DidLeaveGUI" });
        });

        globalEventBus.subscribe("ToggleUIControl", this);
    }

    receiveEvent({ type, data }) {

        const { payload } = data;

        if ("ToggleUIControl" === type && this.$panel.attr('id') === payload) {

            if (true === isHidden) {
                moveOffScreen(this.container, this.$panel.get(0));
            } else {
                moveOnScreen(this.container, this.$panel.get(0));
            }

            isHidden = !isHidden;
        }
    }

    configure({ genomicStart, genomicEnd, structureLength }) {
        this.colorRampWidget.configure({ genomicStart, genomicEnd, structureLength });
    }

    onWindowResize(container, panel) {
        layout(container, panel);
    };

}

let moveOffScreen = (container, element) => {

    // const { left, top, right, bottom, x, y, width, height } = container.getBoundingClientRect();
    const { x: c_x, y:c_y, width: c_w, height: c_h } = container.getBoundingClientRect();

    const left = c_x - c_w;
    const top = c_y - c_y;
    $(element).offset( { left, top } );

};

let moveOnScreen = (container, element) => {
    layout(container, element);
};

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
