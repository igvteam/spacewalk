import * as THREE from "./threejs_es6/three.module.js";
import { globalEventBus } from "./main.js";

import { getMouseXY } from "./utils.js";
import { lerp, quantize } from "./math.js";
import { rgb255Lerp, rgbString } from "./color.js";

class RampWidget {

    constructor({ container, namespace, colors }) {

        this.colors = colors;

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

        $(canvas).on(('mousemove.trace3d.' + namespace), (event) => {
            event.stopPropagation();
            this.onCanvasMouseMove(canvas, event)
        });

        $(canvas).on(('mouseenter.trace3d.' + namespace), (event) => {
            event.stopPropagation();
            this.currentSegmentIndex = undefined;
        });

        $(canvas).on(('mouseleave.trace3d.' + namespace), (event) => {
            event.stopPropagation();
            this.currentSegmentIndex = undefined;
        });

        // footer
        this.footer = document.createElement('div');
        rampContainer.appendChild( this.footer );
        this.footer.className = 'tool_palette_ramp_footer';
        this.footer.innerText = '';

        this.rampContainer = rampContainer;

        this.context = canvas.getContext('2d');
        this.canvas = canvas;

        this.colors = colors;


    }

    onCanvasMouseMove(canvas, event) {

        let { yNormalized } = getMouseXY(canvas, event);

        // flip direction
        yNormalized = 1.0 - yNormalized;
        const quantized = quantize(yNormalized, this.segmentLength);
        const one_based = lerp(1, this.segmentLength, quantized);

        const segmentIndex = Math.ceil(one_based);

        if (this.currentSegmentIndex !== segmentIndex) {
            this.currentSegmentIndex = segmentIndex;
            // console.log('time(' + Date.now() + ') interpolant ' + quantized + ' segment-index ' + segmentIndex);
            globalEventBus.post({type: "RampWidgetDidSelectSegmentIndex", data: segmentIndex });
        }

    };

    paintQuantizedRamp(steps) {
        quantizedGradientCanvasContextRect(this.context, this.colors, steps);
    }

    configure({ chr, genomicStart, genomicEnd, segmentLength }) {

        this.segmentLength = segmentLength;

        const [ ss, ee ] = [ genomicStart / 1e6, genomicEnd / 1e6 ];
        this.footer.innerText = ss + 'Mb';
        this.header.innerText = ee + 'Mb';
        this.paintQuantizedRamp(segmentLength)
    }

    colorForSegmentIndex(index) {

        const interpolant = index / this.segmentLength;
        const { r, g, b } = rgb255Lerp(this.colors[ 0 ], this.colors[ 1 ], interpolant);
        const str = `rgb(${r},${g},${b})`;

        return new THREE.Color( str );
    }

}

let quantizedGradientCanvasContextRect = (ctx, colors, steps) => {

    const yIndices = new Array(ctx.canvas.offsetHeight);

    for (let y = 0;  y < yIndices.length; y++) {

        let value = y / yIndices.length;
        value = quantize(value, steps);
        value = 1.0 - value;

        const { r, g, b } = rgb255Lerp(colors[ 0 ], colors[ 1 ], value);
        ctx.fillStyle = rgbString({ r, g, b });
        ctx.fillRect(0, y, ctx.canvas.offsetWidth, 1);
    }

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
