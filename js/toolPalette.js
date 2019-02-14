import { makeDraggable } from "./draggable.js";

class ToolPalette {
    constructor(container) {

        const element = document.createElement('div');
        element.setAttribute('id', 'trace3d_tool_palette');
        container.appendChild( element );

        [ this.featureRampContext, this.segmentBallRampContext, this.rampContext ] = [ 0, 1, 2 ].map((ignore) => {

            const childElement = document.createElement('div');
            element.appendChild( childElement );

            const canvas = document.createElement('canvas');
            childElement.appendChild( canvas );

            fitToContainer(canvas);

            return canvas.getContext('2d');
        });





        this.featureRampContext.fillStyle = 'green';
        this.featureRampContext.fillRect(0, 0, this.featureRampContext.canvas.offsetWidth, this.featureRampContext.canvas.offsetHeight);

        this.segmentBallRampContext.fillStyle = 'purple';
        this.segmentBallRampContext.fillRect(0, 0, this.segmentBallRampContext.canvas.offsetWidth, this.segmentBallRampContext.canvas.offsetHeight);

        this.rampContext.fillStyle = 'cyan';
        this.rampContext.fillRect(0, 0, this.rampContext.canvas.offsetWidth, this.rampContext.canvas.offsetHeight);







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

export default ToolPalette;
