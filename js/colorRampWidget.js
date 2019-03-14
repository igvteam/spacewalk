import * as THREE from "./threejs_es6/three.module.js";
import { globalEventBus } from "./eventBus.js";

import { fitToContainer, getMouseXY } from "./utils.js";
import { lerp, quantize } from "./math.js";
import { rgb255, rgb255Lerp, rgb255String } from "./color.js";

class ColorRampWidget {

    constructor({ palette, namespace, colors, highlightColor }) {

        this.colors = colors;
        let { r, g, b } = highlightColor;
        this.highlightColor = rgb255(r*255, g*255, b*255);

        let rampContainer;
        let ramp;

        const $palette = $(palette);

        // header
        this.$header = $palette.find('#trace3d_color_ramp_header');

        // ramp canvas
        const $canvas = $palette.find('canvas');
        const canvas = $canvas.get(0);

        fitToContainer(canvas);

        $canvas.on(('mousemove.trace3d.' + namespace), (event) => {
            event.stopPropagation();
            this.onCanvasMouseMove(canvas, event)
        });

        $canvas.on(('mouseenter.trace3d.' + namespace), (event) => {
            event.stopPropagation();
            this.currentSegmentIndex = undefined;
        });

        $canvas.on(('mouseleave.trace3d.' + namespace), (event) => {
            event.stopPropagation();
            this.currentSegmentIndex = undefined;
        });

        // soak up misc events
        let eventSink = e => { e.stopPropagation(); };
        $canvas.on(('mouseup.trace3d.' + namespace), eventSink);
        $canvas.on(('mousedown.trace3d.' + namespace), eventSink);
        $canvas.on(('click.trace3d.' + namespace), eventSink);

        // footer
        this.$footer = $palette.find('#trace3d_color_ramp_footer');

        this.context = canvas.getContext('2d');

        this.canvas = canvas;

        this.colors = colors;
    }

    onCanvasMouseMove(canvas, event) {

        let { yNormalized } = getMouseXY(canvas, event);

        // flip direction
        yNormalized = 1.0 - yNormalized;
        const quantized = quantize(yNormalized, this.structureLength);
        const one_based = lerp(1, this.structureLength, quantized);

        const segmentIndex = Math.ceil(one_based);

        if (this.currentSegmentIndex !== segmentIndex) {
            this.currentSegmentIndex = segmentIndex;
            globalEventBus.post({type: "DidSelectSegmentIndex", data: segmentIndex });
        }

    };

    configure({ chr, genomicStart, genomicEnd, structureLength }) {

        this.structureLength = structureLength;

        const [ ss, ee ] = [ genomicStart / 1e6, genomicEnd / 1e6 ];
        this.$footer.text(ss + 'Mb');
        this.$header.text(ee + 'Mb');
        this.paintQuantizedRamp(this.context, this.colors, structureLength, undefined);
    }

    repaint () {
        this.paintQuantizedRamp(this.context, this.colors, this.structureLength, undefined);
    }

    highlight (segmentIndex) {
        this.paintQuantizedRamp(this.context, this.colors, this.structureLength, segmentIndex)
    }

    paintQuantizedRamp(ctx, colors, structureLength, highlightedSegmentIndex){

        const yIndices = new Array(ctx.canvas.offsetHeight);

        for (let y = 0;  y < yIndices.length; y++) {

            let quantized = y / yIndices.length;
            quantized = quantize(quantized, structureLength);
            quantized = 1.0 - quantized;

            const segmentIndex = Math.round(quantized * structureLength);

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

        const interpolant = index / this.structureLength;
        const { r, g, b } = rgb255Lerp(this.colors[ 0 ], this.colors[ 1 ], interpolant);
        const str = `rgb(${r},${g},${b})`;

        return new THREE.Color( str );
    }

}

export default ColorRampWidget;
