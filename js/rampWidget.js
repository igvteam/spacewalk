import * as THREE from "./threejs_es6/three.module.js";
import { globalEventBus } from "./main.js";

import { getMouseXY } from "./utils.js";
import { lerp, quantize } from "./math.js";
import { rgb255, rgb255Lerp, rgb255String } from "./color.js";

class RampWidget {

    constructor({ container, namespace, colors, highlightColor }) {

        this.colors = colors;
        let { r, g, b } = highlightColor;
        this.highlightColor = rgb255(r*255, g*255, b*255);

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

    configure({ chr, genomicStart, genomicEnd, segmentLength }) {

        this.segmentLength = segmentLength;

        const [ ss, ee ] = [ genomicStart / 1e6, genomicEnd / 1e6 ];
        this.footer.innerText = ss + 'Mb';
        this.header.innerText = ee + 'Mb';
        this.paintQuantizedRamp(this.context, this.colors, this.segmentLength, undefined);
    }

    repaint () {
        this.paintQuantizedRamp(this.context, this.colors, this.segmentLength, undefined);
    }

    highlight (segmentIndex) {
        this.paintQuantizedRamp(this.context, this.colors, this.segmentLength, segmentIndex)
    }

    paintQuantizedRamp(ctx, colors, segmentLength, highlightedSegmentIndex){

        const yIndices = new Array(ctx.canvas.offsetHeight);

        for (let y = 0;  y < yIndices.length; y++) {

            let quantized = y / yIndices.length;
            quantized = quantize(quantized, segmentLength);
            quantized = 1.0 - quantized;

            const segmentIndex = Math.round(quantized * segmentLength);

            // const now = Date.now();
            // console.log('time(' + now + ')' + ' x ' + quantized + ' segment index ' + segmentIndex);

            if (highlightedSegmentIndex && highlightedSegmentIndex === segmentIndex) {
                ctx.fillStyle = rgb255String(this.highlightColor);
            } else {
                const { r, g, b } = rgb255Lerp(colors[ 0 ], colors[ 1 ], quantized);
                ctx.fillStyle = rgb255String({r, g, b});
            }

            ctx.fillRect(0, y, ctx.canvas.offsetWidth, 1);
        }

    }

    colorForSegmentIndex(index) {

        const interpolant = index / this.segmentLength;
        const { r, g, b } = rgb255Lerp(this.colors[ 0 ], this.colors[ 1 ], interpolant);
        const str = `rgb(${r},${g},${b})`;

        return new THREE.Color( str );
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
