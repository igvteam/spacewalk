import { globalEventBus } from "./main.js";
import { makeDraggable } from "./draggable.js";
import { fillCanvasContextRect, gradientCanvasContextRect } from './utils.js';
import { getMouseXY } from "./utils.js";
import { clamp } from './math.js';

class ToolPalette {
    constructor(container) {

        const palette = document.createElement('div');
        palette.setAttribute('id', 'trace3d_tool_palette');
        container.appendChild( palette );

        // [ this.featureRampContext, this.segmentBallRampContext, this.rampContext ] = [ 0, 1, 2 ].map((index) => {
        //
        //     const childElement = document.createElement('div');
        //     palette.appendChild( childElement );
        //
        //     const canvas = document.createElement('canvas');
        //     childElement.appendChild( canvas );
        //
        //     fitToContainer(canvas);
        //
        //     const namespace = 'mousemove.trace3d.toolpalette.' + index;
        //     $(canvas).on(namespace, (event) => { onCanvasMouseMove(canvas, event) });
        //
        //
        //     return canvas.getContext('2d');
        // });

        this.featureRampContext = addWidget(palette, 'featureRamp');
        gradientCanvasContextRect(this.featureRampContext, [ 'blue', 'red' ]);

        // fillCanvasContextRect(this.segmentBallRampContext, 'white');
        // fillCanvasContextRect(this.rampContext, 'white');

        this.layout(container, palette);

        this.container = container;
        this.palette = palette;

        makeDraggable(palette, palette);

        $(window).on('resize.trace3d.toolpalette', () => { this.onWindowResize() });

        $(this.palette).on('mouseenter.trace3d.toolpalette', (event) => { globalEventBus.post({type: "DidEnterToolPalette", data: this }); });

        $(this.palette).on('mouseleave.trace3d.toolpalette', (event) => { globalEventBus.post({type: "DidLeaveToolPalette", data: this }); });

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

let addWidget = (parent, namespace) => {

    let rampContainer;
    let header;
    let ramp;
    let footer;

    // ramp container
    rampContainer = document.createElement('div');
    parent.appendChild( rampContainer );
    rampContainer.className = 'tool_palette_ramp_container';

    // header
    header = document.createElement('div');
    rampContainer.appendChild( header );
    header.className = 'tool_palette_ramp_header';
    header.innerText = 'header';

    // ramp
    ramp = document.createElement('div');
    rampContainer.appendChild( ramp );
    ramp.className = 'tool_palette_ramp';

    // ramp canvas
    const canvas = document.createElement('canvas');
    ramp.appendChild( canvas );

    fitToContainer(canvas);

    const str = 'mousemove.trace3d.toolpalette.' + namespace;
    $(canvas).on(str, (event) => {
        onCanvasMouseMove(canvas, event)
    });

    // footer
    footer = document.createElement('div');
    rampContainer.appendChild( footer );
    footer.className = 'tool_palette_ramp_footer';
    footer.innerText = 'footer';

    return canvas.getContext('2d');
};

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
