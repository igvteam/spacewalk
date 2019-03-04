import { globalEventBus } from "./eventBus.js";
import { makeDraggable } from "./draggable.js";

class SegmentSelectPalette {

    constructor(container) {

        // palette
        const palette = document.createElement('div');
        palette.setAttribute("id", "trace3d_segment_select_palette");
        palette.className = 'trace3d_tool_palette';
        container.appendChild( palette );

        this.select = createSelectWidget(palette);

        layout(container, palette);

        makeDraggable(palette, palette);

        $(window).on('resize.trace3d.segment_select_widget', () => { this.onWindowResize(container, palette) });

        $(palette).on('mouseenter.trace3d.segment_select_widget', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidEnterGUI" });
        });

        $(palette).on('mouseleave.trace3d.segment_select_widget', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidLeaveGUI" });
        });

    }

    configure (segments) {

        $(this.select).empty();

        const keys = Object.keys(segments);
        for (let key of keys) {
            const option = document.createElement('option');
            option.textContent = 'segment ' + key;
            option.setAttribute("value", key);
            this.select.appendChild( option );
        }

    }

    onWindowResize(container, palette) {
        layout(container, palette);
    };

}

let createSelectWidget = (palette) => {

    // form
    const form = document.createElement('form');
    palette.appendChild( form );

    // label
    const label = document.createElement('label');
    label.setAttribute("for", "trace3d_segment_select");
    label.textContent = 'Choose a segment...';

    form.appendChild( label );

    // select
    const select = document.createElement('select');
    select.className = 'form-control';
    select.setAttribute('id', 'trace3d_segment_select');
    select.setAttribute('size', 32);
    form.appendChild( select );

    $(select).on('change.trace3d_segment_select', (e) => {
        const key = $(select).val();
        globalEventBus.post({ type: "DidSelectSegment", data: key });
    });

    let eventSink = e => { e.stopPropagation(); };

    $(select).on('mousedown.trace3d.segment_select', eventSink);

    $(select).on('mouseup.trace3d.segment_select', eventSink);

    $(select).on('mouseover.trace3d.segment_select', eventSink);

    $(select).on('click.trace3d.segment_select', eventSink);

    return select;
};

let layout = (container, element) => {

    // const { left, top, right, bottom, x, y, width, height } = container.getBoundingClientRect();
    const { width, height } = container.getBoundingClientRect();
    const domRect = element.getBoundingClientRect();

    const multiple = 1/4;
    $(element).offset( { left: (multiple * domRect.width), top: ((height - domRect.height)/2) } );

};

export default SegmentSelectPalette;
