import { makeDraggable } from "./draggable.js";

class ToolPalette {
    constructor(container) {

        const element = document.createElement('div');
        element.setAttribute('id', 'trace3d_tool_palette');
        container.appendChild( element );

        $(element).offset( { left:0, top:0 } );


        makeDraggable(element, element);
    }

}

export default ToolPalette;
