import { globalEventBus } from "./main.js";
import { makeDraggable } from "./draggable.js";

class SegmentSelectWidget {
    constructor({ container }) {

        const selectContainer = document.createElement('div');
        selectContainer.className = 'trace3d_tool_palette';

        container.appendChild( selectContainer );

        layout(container, selectContainer);

        this.container = container;
        this.selectContainer = selectContainer;

        makeDraggable(selectContainer, selectContainer);

        $(window).on('resize.trace3d.segment_select_widget', () => { this.onWindowResize() });

        $(this.selectContainer).on('mouseenter.trace3d.segment_select_widget', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidEnterGUI", data: this });
        });

        $(this.selectContainer).on('mouseleave.trace3d.segment_select_widget', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidLeaveGUI", data: this });
        });

    }

    configure({ }) {
    }

    onWindowResize() {
        layout(this.container, this.selectContainer);
    };

}

let layout = (container, element) => {

    // const { left, top, right, bottom, x, y, width, height } = container.getBoundingClientRect();
    const { width, height } = container.getBoundingClientRect();
    const domRect = element.getBoundingClientRect();

    const multiple = 1/4;
    $(element).offset( { left: (multiple * domRect.width), top: ((height - domRect.height)/2) } );

};

export default SegmentSelectWidget;
