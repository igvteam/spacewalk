import { globalEventBus } from "./main.js";
import { makeDraggable } from "./draggable.js";

class SegmentSelectWidget {
    constructor({ container }) {

        console.log('SegmentSelectWidget.new - begin');

        // palette
        const palette = document.createElement('div');
        palette.setAttribute("id", "trace3d_segment_select_palette");
        palette.className = 'trace3d_tool_palette';
        container.appendChild( palette );

        this.select = createSelectWidget(palette);

        layout(container, palette);

        this.container = container;
        this.palette = palette;

        // makeDraggable(palette, palette);

        $(window).on('resize.trace3d.segment_select_widget', () => { this.onWindowResize() });

        $(this.palette).on('mouseenter.trace3d.segment_select_widget', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidEnterGUI", data: this });
        });

        $(this.palette).on('mouseleave.trace3d.segment_select_widget', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidLeaveGUI", data: this });
        });

        console.log('SegmentSelectWidget.new - end');

    }

    configure({ segments }) {

        $(this.select).empty();

        Object.values(segments).forEach((segment, index) => {

            const option = document.createElement('option');
            option.textContent = 'segment ' + index;
            option.setAttribute("value", index);
            this.select.appendChild( option );

        });

    }

    onWindowResize() {
        layout(this.container, this.palette);
    };

}

let createSelectWidget = palette => {

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
    form.appendChild( select );

    // button
    const button = document.createElement('button');
    button.classList.add('btn', 'dropdown-toggle', 'bs-placeholder');
    button.setAttribute('data-toggle', 'dropdown');
    button.setAttribute('title', 'Select a number');

    return select;

};

let layout = (container, element) => {

    // const { left, top, right, bottom, x, y, width, height } = container.getBoundingClientRect();
    const { width, height } = container.getBoundingClientRect();
    const domRect = element.getBoundingClientRect();

    const multiple = 1/4;
    $(element).offset( { left: (multiple * domRect.width), top: ((height - domRect.height)/2) } );

};

export default SegmentSelectWidget;
