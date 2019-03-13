import { globalEventBus } from "./eventBus.js";
import { makeDraggable } from "./draggable.js";
import ColorRampWidget from "./colorRampWidget.js";

class ColorRampPalette {
    constructor({ container, colors, highlightColor }) {

        const palette = document.createElement('div');
        palette.className = 'trace3d_tool_palette';
        // palette.setAttribute('id', 'trace3d_tool_palette');
        container.appendChild( palette );

        this.genomicRampWidget = new ColorRampWidget( { container: palette, namespace: 'genomicRampWidget', colors, highlightColor } );

        layout(container, palette);

        makeDraggable(palette, palette);

        $(window).on('resize.trace3d.toolpalette', () => {
            this.onWindowResize(container, palette)
        });

        $(palette).on('mouseenter.trace3d.toolpalette', (event) => {
            event.stopPropagation();
            this.genomicRampWidget.repaint();
            globalEventBus.post({type: "DidEnterGUI" });
        });

        $(palette).on('mouseleave.trace3d.toolpalette', (event) => {
            event.stopPropagation();
            globalEventBus.post({type: "DidLeaveGUI" });
        });

    }

    configure({ chr, genomicStart, genomicEnd, structureLength }) {
        this.genomicRampWidget.configure({ chr, genomicStart, genomicEnd, structureLength });
    }

    onWindowResize(container, palette) {
        layout(container, palette);
    };

}

let layout = (container, element) => {

    // const { left, top, right, bottom, x, y, width, height } = container.getBoundingClientRect();
    const { width, height } = container.getBoundingClientRect();
    const domRect = element.getBoundingClientRect();

    const multiple = 5/4;
    $(element).offset( { left: (width - multiple * domRect.width), top: ((height - domRect.height)/2) } );

};

export default ColorRampPalette;
