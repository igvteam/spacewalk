import { globalEventBus } from "./eventBus.js";
import { fitToContainer, getMouseXY } from "./utils.js";
import { quantize } from "./math.js";
import { rgb255, rgb255String, rgba255, rgba255String } from "./color.js";
import { defaultColormapName } from "./sceneManager.js";

let currentSegmentIndex = undefined;

const alpha_hidden = `rgb(${32},${32},${32})`;
const alpha_visible = `rgb(${255},${255},${255})`;

class ColorRampWidget {

    constructor({ panel, namespace, colorMapManager, highlightColor }) {

        this.colorMapManager = colorMapManager;

        let { r, g, b } = highlightColor;
        this.highlightColor = rgb255(r*255, g*255, b*255);

        const $panel = $(panel);

        // header
        this.$header = $panel.find('#trace3d_color_ramp_header');

        // ramp rgb canvas
        const $canvas = $panel.find('#trace3d_color_ramp_canvas_rgb');
        const canvas = $canvas.get(0);

        fitToContainer(canvas);

        $canvas.on(('mousemove.trace3d.' + namespace), (event) => {
            event.stopPropagation();
            this.onCanvasMouseMove(canvas, event)
        });

        $canvas.on(('mouseenter.trace3d.' + namespace), (event) => {
            event.stopPropagation();
            currentSegmentIndex = undefined;
        });

        $canvas.on(('mouseleave.trace3d.' + namespace), (event) => {
            event.stopPropagation();
            currentSegmentIndex = undefined;
            this.repaint();
        });

        this.context = canvas.getContext('2d');
        this.canvas = canvas;


        // ramp rgb canvas
        const $alphamap_canvas = $panel.find('#trace3d_color_ramp_canvas_alpha');
        const alphamap_canvas = $alphamap_canvas.get(0);

        fitToContainer(alphamap_canvas);

        this.alphamap_ctx = alphamap_canvas.getContext('2d');
        this.alphamap_canvas = alphamap_canvas;


        // soak up misc events
        let eventSink = e => { e.stopPropagation(); };
        $canvas.on(('mouseup.trace3d.' + namespace), eventSink);
        $canvas.on(('mousedown.trace3d.' + namespace), eventSink);
        $canvas.on(('click.trace3d.' + namespace), eventSink);

        // footer
        this.$footer = $panel.find('#trace3d_color_ramp_footer');

    }

    configure({ genomicStart, genomicEnd, structureLength }) {

        this.structureLength = structureLength;

        const [ ss, ee ] = [ genomicStart / 1e6, genomicEnd / 1e6 ];
        this.$footer.text(ss + 'Mb');
        this.$header.text(ee + 'Mb');
        this.paintQuantizedRamp(undefined);
    }

    repaint () {
        this.paintQuantizedRamp(undefined);
    }

    onCanvasMouseMove(canvas, event) {

        if (undefined === this.structureLength) {
            return;
        }

        let { yNormalized } = getMouseXY(canvas, event);

        // 0 to 1. Flip direction.
        const segmentIndex = segmentIndexForInterpolant(1.0 - yNormalized, this.structureLength);

        this.highlight(segmentIndex);

        if (currentSegmentIndex !== segmentIndex) {
            currentSegmentIndex = segmentIndex;
            globalEventBus.post({type: "DidSelectSegmentIndex", data: segmentIndex });
        }

    };

    highlight(segmentIndexList) {
        this.paintQuantizedRamp(new Set(segmentIndexList))
    }

    paintQuantizedRamp(highlightedSegmentIndexSet){

        if (undefined === this.structureLength) {
            return;
        }

        const yIndices = new Array(this.context.canvas.offsetHeight);

        for (let y = 0;  y < yIndices.length; y++) {

            const interpolant = 1 - (y / (yIndices.length - 1));
            const quantizedInterpolant = quantize(interpolant, this.structureLength);
            const segmentIndex = segmentIndexForInterpolant(interpolant, this.structureLength);

            if (highlightedSegmentIndexSet) {
                this.alphamap_ctx.fillStyle = highlightedSegmentIndexSet.has(segmentIndex) ? alpha_visible : alpha_hidden;
            } else {
                this.alphamap_ctx.fillStyle = alpha_visible;
            }

            this.context.fillStyle = this.colorMapManager.retrieveRGB255String(defaultColormapName, quantizedInterpolant);
            this.context.fillRect(0, y, this.context.canvas.offsetWidth, 1);

            this.alphamap_ctx.fillRect(0, y, this.alphamap_ctx.canvas.offsetWidth, 1);

        }

    }

    colorForInterpolant(interpolant) {
        return this.colorMapManager.retrieveThreeJS(defaultColormapName, interpolant)
    }

}

export const segmentIndexForInterpolant = (interpolant, structureLength) => {

    // find bucket. 0 based.
    let quantized = quantize(interpolant, structureLength);

    // Scale to structure length. Convert to discrete value (integer-ize).
    // Segment index is 1-based.
    return 1 + Math.ceil(quantized * (structureLength - 1));
};

export default ColorRampWidget;
