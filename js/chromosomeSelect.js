import { makeDraggable } from "./draggable.js";
import {globalEventBus} from "./eventBus.js";

class ChromosomeSelect {

    constructor({ container, palette }) {

        layout(container, palette);

        makeDraggable(palette, palette);

        $(window).on('resize.trace3d.chromosome_select', () => { this.onWindowResize(container, palette) });

        $(palette).on('mouseenter.trace3d.chromosome_select', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidEnterGUI" });
        });

        $(palette).on('mouseleave.trace3d.chromosome_select', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidLeaveGUI" });
        });

    }

    onWindowResize(container, palette) {
        layout(container, palette);
    };

}

let layout = (container, element) => {

    // const { left, top, right, bottom, x, y, width, height } = container.getBoundingClientRect();
    const rectContainer = container.getBoundingClientRect();
    const rectElement = element.getBoundingClientRect();

    const left = 0.125 * rectElement.width;
    const top = (rectContainer.height - rectElement.height)/2;
    $(element).offset( { left, top } );

};

export default ChromosomeSelect;
