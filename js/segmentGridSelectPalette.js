import { makeDraggable } from "./draggable.js";
import { globalEventBus } from "./eventBus.js";
import { randomRGB255, rgb255String } from "./color.js";
import {numberFormatter} from "./utils.js";

let clickedElement = undefined;

class SegmentGridSelectPalette {

    constructor(container) {

        // palette
        const palette = document.createElement('div');
        palette.className = 'trace3d_segment_grid_select_palette';
        container.appendChild( palette );

        layout(container, palette);

        makeDraggable(palette, palette);

        $(window).on('resize.trace3d.segment_grid_select_palette', () => {
            this.onWindowResize(container, palette)
        });

        $(palette).on('mouseenter.trace3d.segment_grid_select_palette', (event) => {

            event.stopPropagation();

            if (clickedElement) {
                $(clickedElement).removeClass('trace3d_segment_grid_cell_clicked');
                $(clickedElement).addClass('trace3d_segment_grid_cell_unclicked');
                clickedElement = undefined;
            }

            globalEventBus.post({ type: "DidEnterGUI" });
        });

        $(palette).on('mouseleave.trace3d.segment_grid_select_palette', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidLeaveGUI" });
        });

        this.palette = palette;
    }

    configure(segments) {

        buildPalette(this.palette, segments);
    }

    onWindowResize(container, palette) {
        layout(container, palette);
    };

}

let buildPalette = (palette, segments) => {

    $(palette).empty();

    // header
    const header = document.createElement('div');
    header.setAttribute("id", "trace3d_segment_grid_select_header");
    // header.textContent = 'Segment XXXX';
    palette.appendChild( header );

    // box
    const box = document.createElement('div');
    box.setAttribute("id", "trace3d_segment_grid_select_box");

    palette.appendChild( box );

    // soak up misc events
    let eventSink = e => { e.stopPropagation(); };
    $(box).on('mouseup.trace3d.segment_grid_select_box', eventSink);
    $(box).on('mousedown.trace3d.segment_grid_select_box', eventSink);
    $(box).on('click.trace3d.segment_grid_select_box', eventSink);


    // cells
    const keys = Object.keys(segments);
    for (let key of keys) {

        const cell = document.createElement('div');
        cell.className = 'trace3d_segment_grid_cell';

        box.appendChild( cell );

        // cell.style.backgroundColor = rgb255String(randomRGB255(64, 255));

        $(cell).on('mouseenter.trace3d.segment_grid_select_cell', (event) => {
            mouseEnterHandler(event, cell, key, header);
        });

        $(cell).on('mouseleave.trace3d.segment_grid_select_cell', (event) => {
            mouseLeaveHander(event, cell);
        });

        $(cell).on('click.trace3d.segment_grid_select_cell', (event) => {
            clickHander(event, cell, key, header);
        });

    }

};

let mouseLeaveHander = (event, element) => {

    event.stopPropagation();

    if (clickedElement === element) {
        return;
    }

    $(element).removeClass('trace3d_segment_grid_cell_clicked');
    $(element).addClass('trace3d_segment_grid_cell_unclicked');

};

let mouseEnterHandler = (event, element, key, header) => {

    event.stopPropagation();

    if (clickedElement === element) {
        return;
    }

    $(element).removeClass('trace3d_segment_grid_cell_unclicked');
    $(element).addClass('trace3d_segment_grid_cell_clicked');

    if (clickedElement) {
        // ignore
    } else {
        header.textContent = 'Chr ' + numberFormatter(key);
        globalEventBus.post({ type: "DidSelectSegment", data: key });
        globalEventBus.post({ type: "DidLeaveGUI" });
    }

};

let clickHander = (event, element, key, header) => {
    event.stopPropagation();

    if (clickedElement) {
        $(clickedElement).removeClass('trace3d_segment_grid_cell_clicked');
        $(clickedElement).addClass('trace3d_segment_grid_cell_unclicked');
    }

    header.textContent = 'Chr ' + numberFormatter(key);

    if (clickedElement === element) {
        clickedElement = undefined;
    } else {
        clickedElement = element;
        $(clickedElement).removeClass('trace3d_segment_grid_cell_unclicked');
        $(clickedElement).addClass('trace3d_segment_grid_cell_clicked');
        globalEventBus.post({ type: "DidSelectSegment", data: key });
        globalEventBus.post({ type: "DidLeaveGUI" });
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
