import { getMouseXY, gradientCanvasContextRect } from "./utils.js";

class RampWidget {

    constructor(container, namespace) {

        let rampContainer;
        let header;
        let ramp;
        let footer;

        // ramp container
        rampContainer = document.createElement('div');
        container.appendChild( rampContainer );
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

        this.context = canvas.getContext('2d');
        this.canvas = canvas;

        gradientCanvasContextRect(this.context, [ 'blue', 'red' ]);

    }

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

    let { yNormalized } = getMouseXY(canvas, event);

    // flip direction
    yNormalized = 1.0 - yNormalized;

    console.log('interpolant ' + yNormalized);

};

export default RampWidget;
