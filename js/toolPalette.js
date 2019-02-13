import { makeDraggable } from "./draggable.js";

class ToolPalette {
    constructor(container) {

        const element = document.createElement('div');
        element.setAttribute('id', 'trace3d_tool_palette');
        container.appendChild( element );

        [ 0, 1, 2 ].forEach((ignore) => {

            const childElement = document.createElement('div');
            // childElement.setAttribute('id', 'trace3d_tool_palette');
            element.appendChild( childElement );

        });


        this.layout(container, element);

        this.container = container;
        this.element = element;

        makeDraggable(element, element);

        $(window).on('resize.trace3d.toolpalette', () => { this.onWindowResize() });


    }

    layout(container, element) {

        // const { left, top, right, bottom, x, y, width, height } = container.getBoundingClientRect();
        const { width, height } = container.getBoundingClientRect();
        const domRect = element.getBoundingClientRect();

        const multiple = 5/4;
        $(element).offset( { left: (width - multiple * domRect.width), top: ((height - domRect.height)/2) } );

    }

    onWindowResize() {
        this.layout(this.container, this.element);
    };

}

export default ToolPalette;
