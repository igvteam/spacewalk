import { getMouseXY, numberFormatter, fillCanvasContextRect } from "./utils.js";
import {quantize} from "./math.js";
import {greyScale255, rgbString} from "./color.js";

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

        this.colors = colors;


    }

    onCanvasMouseMove(canvas, event) {

        let { yNormalized } = getMouseXY(canvas, event);

        // flip direction
        yNormalized = 1.0 - yNormalized;

        console.log('interpolant ' + yNormalized);

    };

    paintColorRamp(colors) {
        gradientCanvasContextRect(this.context, colors);
    }

    paintQuantizedRamp(steps) {
        quantizedGradientCanvasContextRect(this.context, steps);
    }

    configure({ chr, genomicStart, genomicEnd, segmentLength }) {
        const [ ss, ee ] = [ genomicStart / 1e6, genomicEnd / 1e6 ];
        this.footer.innerText = ss + 'Mb';
        this.header.innerText = ee + 'Mb';
        this.paintQuantizedRamp(segmentLength)
    }

}

let quantizedGradientCanvasContextRect = (ctx, steps) => {

    const yIndices = new Array(ctx.canvas.offsetHeight);

    for (let y = 0;  y < yIndices.length; y++) {

        let value = y / yIndices.length;
        value = quantize(value, steps);
        value = 1.0 - value;

        const { r, g, b } = greyScale255(255 * value);
        ctx.fillStyle = rgbString({ r, g, b });
        ctx.fillRect(0, y, ctx.canvas.offsetWidth, 1);
    }

};

let gradientCanvasContextRect = (ctx, colorStringList) => {

    let gradient = ctx.createLinearGradient(0, 0, 0,ctx.canvas.offsetHeight);

    colorStringList.forEach((colorString, i, array) => {
        const interpolant = i / (array.length - 1);
        gradient.addColorStop(interpolant, colorString);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctx.canvas.offsetWidth, ctx.canvas.offsetHeight);
};

let fitToContainer = (canvas) => {

    // Make it visually fill the positioned parent
    canvas.style.width ='100%';
    canvas.style.height ='100%';

    // ...then set the internal size to match
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
};

export default RampWidget;
