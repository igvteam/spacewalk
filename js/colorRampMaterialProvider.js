import * as THREE from "./threejs_es6/three.module.js";
import { globalEventBus } from "./eventBus.js";

import { fitToContainer, getMouseXY } from "./utils.js";
import { quantize } from "./math.js";
import { rgb255, rgb255String } from "./color.js";
import { defaultColormapName } from "./sceneManager.js";
import { sceneManager, ballAndStick } from "./main.js";

let currentSegmentIndex = undefined;

const alpha_hidden = `rgb(${32},${32},${32})`;
const alpha_visible = `rgb(${255},${255},${255})`;

let rgbTexture;
let alphaTexture;
class ColorRampMaterialProvider {

    constructor({ $canvasContainer, namespace, colorMapManager, highlightColor }) {

        let canvas;

        // highlight canvas
        canvas = $canvasContainer.find('#trace3d_color_ramp_canvas_highlight').get(0);
        fitToContainer(canvas);
        this.highlight_ctx = canvas.getContext('2d');

        // ramp rgb canvas
        canvas = $canvasContainer.find('#trace3d_color_ramp_canvas_rgb').get(0);
        fitToContainer(canvas);
        this.rgb_ctx = canvas.getContext('2d');

        // alpha canvas indicating highlighted region of rgb canvas
        canvas = $canvasContainer.find('#trace3d_color_ramp_canvas_alpha').get(0);
        fitToContainer(canvas);
        this.alphamap_ctx = canvas.getContext('2d');

        // rgb
        rgbTexture = new THREE.CanvasTexture(this.rgb_ctx.canvas);
        rgbTexture.center.set(0.5, 0.5);
        rgbTexture.rotation = Math.PI/2.0;
        rgbTexture.minFilter = rgbTexture.magFilter = THREE.NearestFilter;

        // alpha
        alphaTexture = new THREE.CanvasTexture(this.alphamap_ctx.canvas);
        alphaTexture.center.set(0.5, 0.5);
        alphaTexture.rotation = Math.PI/2.0;
        alphaTexture.minFilter = alphaTexture.magFilter = THREE.NearestFilter;

        let material = new THREE.MeshPhongMaterial({ map: rgbTexture, alphaMap: alphaTexture });
        material.alphaTest = 0.5;
        material.side = THREE.DoubleSide;
        material.transparent = true;

        this.material = material;

        $canvasContainer.on(('mousemove.trace3d.' + namespace), (event) => {
            event.stopPropagation();
            this.onCanvasMouseMove(canvas, event)
        });

        $canvasContainer.on(('mouseenter.trace3d.' + namespace), (event) => {
            event.stopPropagation();
            currentSegmentIndex = undefined;
        });

        $canvasContainer.on(('mouseleave.trace3d.' + namespace), (event) => {
            event.stopPropagation();
            currentSegmentIndex = undefined;
        });

        // soak up misc events
        let eventSink = e => { e.stopPropagation(); };
        $canvasContainer.on(('mouseup.trace3d.' + namespace), eventSink);
        $canvasContainer.on(('mousedown.trace3d.' + namespace), eventSink);
        $canvasContainer.on(('click.trace3d.' + namespace), eventSink);


        this.colorMapManager = colorMapManager;

        const { r, g, b } = highlightColor;
        this.highlightColor = rgb255String( rgb255(r*255, g*255, b*255) );


        globalEventBus.subscribe("DidLeaveGUI", this);
        globalEventBus.subscribe("PickerDidLeaveObject", this);
        globalEventBus.subscribe("PickerDidHitObject", this);
        globalEventBus.subscribe("DidSelectSegmentIndex", this);
    }

    receiveEvent({ type, data }) {

        if ("PickerDidHitObject" === type) {

            if (ballAndStick.indexDictionary[ data ]) {
                const segmentIndex = 1 + ballAndStick.indexDictionary[ data ].index;
                this.highlight([segmentIndex])
            }

        } else if ("PickerDidLeaveObject" === type) {

            this.repaint();

        } else if ("DidSelectSegmentIndex" === type) {

            this.highlight(data);

        } else if (sceneManager && "DidLeaveGUI" === type) {

            this.repaint();

        }
    }

    configure({ structureLength }) {

        this.structureLength = structureLength;

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

        this.highlight([ segmentIndex ]);

        if (currentSegmentIndex !== segmentIndex) {
            currentSegmentIndex = segmentIndex;
            globalEventBus.post({type: "DidSelectSegmentIndex", data: [ segmentIndex ] });
        }

    };

    highlight(segmentIndexList) {
        this.paintQuantizedRamp(new Set(segmentIndexList))
    }

    paintQuantizedRamp(highlightedSegmentIndexSet){

        if (undefined === this.structureLength) {
            return;
        }

        const yIndices = new Array(this.rgb_ctx.canvas.offsetHeight);
        let interpolant;
        let quantizedInterpolant;
        let segmentIndex;

        // paint rgb ramp
        for (let y = 0;  y < yIndices.length; y++) {
            interpolant = 1 - (y / (yIndices.length - 1));
            quantizedInterpolant = quantize(interpolant, this.structureLength);
            segmentIndex = segmentIndexForInterpolant(interpolant, this.structureLength);
            this.rgb_ctx.fillStyle = this.colorMapManager.retrieveRGB255String(defaultColormapName, quantizedInterpolant);
            this.rgb_ctx.fillRect(0, y, this.rgb_ctx.canvas.offsetWidth, 1);
        }

        // clear highlight canvas
        this.highlight_ctx.clearRect(0, 0, this.highlight_ctx.canvas.offsetWidth, this.highlight_ctx.canvas.offsetHeight);

        // paint alpha map opacque
        this.alphamap_ctx.fillStyle = alpha_visible;
        this.alphamap_ctx.fillRect(0, 0, this.alphamap_ctx.canvas.offsetWidth, this.alphamap_ctx.canvas.offsetHeight);

        if (highlightedSegmentIndexSet) {

            // set highlight color
            this.highlight_ctx.fillStyle = this.highlightColor;

            // paint alpha map transparent
            this.alphamap_ctx.clearRect(0, 0, this.alphamap_ctx.canvas.offsetWidth, this.alphamap_ctx.canvas.offsetHeight);

            // set opaque color
            this.alphamap_ctx.fillStyle = alpha_visible;

            for (let y = 0;  y < yIndices.length; y++) {

                interpolant = 1 - (y / (yIndices.length - 1));
                quantizedInterpolant = quantize(interpolant, this.structureLength);
                segmentIndex = segmentIndexForInterpolant(interpolant, this.structureLength);

                if (highlightedSegmentIndexSet.has(segmentIndex)) {
                    this.highlight_ctx.fillRect(0, y, this.highlight_ctx.canvas.offsetWidth, 1);
                    this.alphamap_ctx.fillRect(0, y, this.alphamap_ctx.canvas.offsetWidth, 1);
                }

            } // for (y)

        } // if (highlightedSegmentIndexSet)

    }

    colorForInterpolant(interpolant) {
        return this.colorMapManager.retrieveThreeJS(defaultColormapName, interpolant)
    }

    renderLoopHelper () {

        if (rgbTexture) {
            rgbTexture.needsUpdate = true;
        }

        if (alphaTexture) {
            alphaTexture.needsUpdate = true;
        }

    }

}

export const segmentIndexForInterpolant = (interpolant, structureLength) => {

    // find bucket. 0 based.
    let quantized = quantize(interpolant, structureLength);

    // Scale to structure length. Convert to discrete value (integer-ize).
    // Segment index is 1-based.
    return 1 + Math.ceil(quantized * (structureLength - 1));
};

export default ColorRampMaterialProvider;
