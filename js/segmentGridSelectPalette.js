import { makeDraggable } from "./draggable.js";
import { globalEventBus } from "./main.js";
import { randomRGB255, rgb255String } from "./color.js";

class SegmentGridSelectPalette {

    constructor({ container, segmentManager }) {

        // palette
        const palette = document.createElement('div');
        palette.className = 'trace3d_segment_grid_select_palette';
        container.appendChild( palette );

        buildPalette(palette, Object.keys(segmentManager.segments));

        layout(container, palette);

        makeDraggable(palette, palette);

        $(window).on('resize.trace3d.segment_grid_select_palette', () => {
            this.onWindowResize(container, palette)
        });

        $(palette).on('mouseenter.trace3d.segment_grid_select_palette', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidEnterGUI", data: this });
        });

        $(palette).on('mouseleave.trace3d.segment_grid_select_palette', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidLeaveGUI", data: this });
        });

    }

    onWindowResize(container, palette) {
        layout(container, palette);
    };

}

let buildPalette = (parent, segmentKeys) => {

    // box
    const box = document.createElement('div');
    parent.appendChild( box );


    // soak up misc events
    let eventSink = e => { e.stopPropagation(); };
    $(box).on('mouseup.trace3d.segment_grid_select_box', eventSink);
    $(box).on('mousedown.trace3d.segment_grid_select_box', eventSink);
    $(box).on('click.trace3d..segment_grid_select_box', eventSink);


    // cells
    for(let i = 0; i < segmentKeys.length; i++) {
        const cell = document.createElement('div');
        cell.setAttribute('id', ('segment#' + i));
        // cell.style.backgroundColor = rgb255String(randomRGB255(64, 255));
        box.appendChild( cell );
    }

};

let layout = (container, element) => {

    // const { left, top, right, bottom, x, y, width, height } = container.getBoundingClientRect();
    const { width, height } = container.getBoundingClientRect();
    const domRect = element.getBoundingClientRect();

    const multiple = 1/4;
    $(element).offset( { left: (multiple * domRect.width), top: ((height - domRect.height)/2) } );

};

export default SegmentGridSelectPalette;
