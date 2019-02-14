import { makeDraggable } from "./draggable.js";
import { fillCanvasContextRect, gradientCanvasContextRect } from './utils.js';
import { getMouseXY } from "./utils.js";
import { clamp } from './math.js';

class ToolPalette {
    constructor(container) {

        const element = document.createElement('div');
        element.setAttribute('id', 'trace3d_tool_palette');
        container.appendChild( element );

        [ this.featureRampContext, this.segmentBallRampContext, this.rampContext ] = [ 0, 1, 2 ].map((index) => {

            const childElement = document.createElement('div');
            element.appendChild( childElement );

            const canvas = document.createElement('canvas');
            childElement.appendChild( canvas );

            fitToContainer(canvas);

            const namespace = 'mousemove.trace3d.toolpalette.' + index;
            $(canvas).on(namespace, (event) => { onCanvasMouseMove(canvas, event) });


            return canvas.getContext('2d');
        });


        gradientCanvasContextRect(this.featureRampContext, [ 'blue', 'red' ]);
        fillCanvasContextRect(this.segmentBallRampContext, 'white');
        fillCanvasContextRect(this.rampContext, 'white');


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

let fitToContainer = (canvas) => {

    // Make it visually fill the positioned parent
    canvas.style.width ='100%';
    canvas.style.height ='100%';

    // ...then set the internal size to match
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
};

let onCanvasMouseMove = (canvas, event) => {

    let { y } = getMouseXY(canvas, event);
    y = clamp(y, 0, canvas.offsetHeight - 1);

    let interpolant = y / (canvas.offsetHeight - 1);
    interpolant = 1 - interpolant;

    console.log('interpolant ' + interpolant);

};

export default ToolPalette;
