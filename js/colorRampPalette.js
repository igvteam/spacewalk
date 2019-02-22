import { globalEventBus } from "./main.js";
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

        this.container = container;
        this.palette = palette;

        makeDraggable(palette, palette);

        $(window).on('resize.trace3d.toolpalette', () => { this.onWindowResize() });

        $(this.palette).on('mouseenter.trace3d.toolpalette', (event) => {
            event.stopPropagation();
            this.genomicRampWidget.repaint();
            globalEventBus.post({type: "DidEnterGUI", data: this });
        });

        $(this.palette).on('mouseleave.trace3d.toolpalette', (event) => {
            event.stopPropagation();
            globalEventBus.post({type: "DidLeaveGUI", data: this });
        });

    }

    configure({ chr, genomicStart, genomicEnd, segmentLength }) {
        this.genomicRampWidget.configure({ chr, genomicStart, genomicEnd, segmentLength });
    }

    onWindowResize() {
        layout(this.container, this.palette);
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
