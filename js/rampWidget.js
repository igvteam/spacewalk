import { getMouseXY, numberFormatter, gradientCanvasContextRect, quantizedGradientCanvasContextRect } from "./utils.js";

class RampWidget {

    constructor({ container, namespace, colors }) {

        let rampContainer;
        let ramp;

        // ramp container
        rampContainer = document.createElement('div');
        container.appendChild( rampContainer );
        rampContainer.className = 'tool_palette_ramp_container';

        // header
        this.header = document.createElement('div');
        rampContainer.appendChild( this.header );
        this.header.className = 'tool_palette_ramp_header';
        this.header.innerText = '';

        // ramp
        ramp = document.createElement('div');
        rampContainer.appendChild( ramp );
        ramp.className = 'tool_palette_ramp';

        // ramp canvas
        const canvas = document.createElement('canvas');
        ramp.appendChild( canvas );

        fitToContainer(canvas);

        const str = 'mousemove.trace3d.' + namespace;
        $(canvas).on(str, (event) => {
            this.onCanvasMouseMove(canvas, event)
        });

        // footer
        this.footer = document.createElement('div');
        rampContainer.appendChild( this.footer );
        this.footer.className = 'tool_palette_ramp_footer';
        this.footer.innerText = '';

        this.context = canvas.getContext('2d');
        this.canvas = canvas;

       this.paintColorRamp(colors);

    }

    onCanvasMouseMove(canvas, event) {

        let { yNormalized } = getMouseXY(canvas, event);

        // flip direction
        yNormalized = 1.0 - yNormalized;

        console.log('interpolant ' + yNormalized);

    };

    paintColorRamp(colors) {
        // gradientCanvasContextRect(this.context, colors);
        quantizedGradientCanvasContextRect(this.context);
    }

    configure({ chr, genomicStart, genomicEnd }) {
        this.footer.innerText = numberFormatter(genomicStart);
        this.header.innerText = numberFormatter(genomicEnd);
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


export default RampWidget;
