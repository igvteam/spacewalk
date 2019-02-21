import { globalEventBus } from "./main.js";
import { makeDraggable } from "./draggable.js";

class SegmentSelectWidget {
    constructor({ container }) {

        const selectContainer = document.createElement('div');
        selectContainer.setAttribute("id", "segment_select_widget");
        selectContainer.className = 'trace3d_tool_palette';
        container.appendChild( selectContainer );

        this.select = createSelectWidget(selectContainer);

        $(this.select).on('changed.bs.select', (e, clickedIndex, isSelected, previousValue) => {
            console.log('selected ' + Date.now() + ' ' + this.select.value + ' ' + clickedIndex + ' ' + isSelected);
        });

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

    configure({ segment }) {

        console.log('segment select widget - ' + segment.length);

        $(this.select).empty();

        segment.forEach((seg) => {

            const option = document.createElement('option');
            select.appendChild( option );

            option.textContent = string;
        });

    }

    onWindowResize() {
        layout(this.container, this.selectContainer);
    };

}

let createSelectWidget = container => {

    const select = document.createElement('select');
    select.className = 'selectpicker';
    select.setAttribute('data-width', '180px');
    select.setAttribute('title', 'Choose segment...');

    container.appendChild( select );

    // [ 'Mustard', 'Ketchup', 'Relish' ].forEach((string) => {
    //
    //     const option = document.createElement('option');
    //     select.appendChild( option );
    //
    //     option.textContent = string;
    // });

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
