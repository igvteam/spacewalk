import * as THREE from "../node_modules/three/build/three.module.js";
import Globals from './globals.js';
import { segmentIndexForInterpolant, fitToContainer, getMouseXY } from "./utils.js";
import { quantize } from "./math.js";
import { appleCrayonColorThreeJS, rgb255, rgb255String } from "./color.js";
import { defaultColormapName } from "./colorMapManager.js";

let currentSegmentIndex = undefined;

const alpha_visible = `rgb(${255},${255},${255})`;

let rgbTexture;
let alphaTexture;
class ColorRampMaterialProvider {

    constructor({ $canvasContainer, namespace, highlightColor }) {

        let canvas;

        // highlight canvas
        canvas = $canvasContainer.find('#spacewalk_color_ramp_canvas_highlight').get(0);
        fitToContainer(canvas);
        this.highlight_ctx = canvas.getContext('2d');

        // ramp rgb canvas
        canvas = $canvasContainer.find('#spacewalk_color_ramp_canvas_rgb').get(0);
        fitToContainer(canvas);
        this.rgb_ctx = canvas.getContext('2d');

        // alpha canvas indicating highlighted region of rgb canvas
        canvas = $canvasContainer.find('#spacewalk_color_ramp_canvas_alpha').get(0);
        fitToContainer(canvas);
        this.alphamap_ctx = canvas.getContext('2d');

        // rgb
        rgbTexture = new THREE.CanvasTexture(this.rgb_ctx.canvas);
        rgbTexture.center.set(0.5, 0.5);
        rgbTexture.rotation = -Math.PI/2.0;
        rgbTexture.minFilter = rgbTexture.magFilter = THREE.NearestFilter;

        // alpha
        alphaTexture = new THREE.CanvasTexture(this.alphamap_ctx.canvas);
        alphaTexture.center.set(0.5, 0.5);
        alphaTexture.rotation = -Math.PI/2.0;
        alphaTexture.minFilter = alphaTexture.magFilter = THREE.NearestFilter;

        let material = new THREE.MeshPhongMaterial({ map: rgbTexture, alphaMap: alphaTexture });
        material.alphaTest = 0.5;
        material.side = THREE.DoubleSide;
        material.transparent = true;

        this.material = material;

        $canvasContainer.on(('mousemove.' + namespace), (event) => {
            event.stopPropagation();
            this.onCanvasMouseMove(canvas, event)
        });

        $canvasContainer.on(('mouseenter.' + namespace), (event) => {
            event.stopPropagation();
            currentSegmentIndex = undefined;
        });

        $canvasContainer.on(('mouseleave.' + namespace), (event) => {
            event.stopPropagation();
            currentSegmentIndex = undefined;
        });

        // soak up misc events
        let eventSink = e => { e.stopPropagation(); };
        $canvasContainer.on(('mouseup.' + namespace), eventSink);
        $canvasContainer.on(('mousedown.' + namespace), eventSink);
        $canvasContainer.on(('click.' + namespace), eventSink);

        const { r, g, b } = highlightColor;
        this.highlightColor = rgb255String( rgb255(r*255, g*255, b*255) );


        Globals.eventBus.subscribe("DidLeaveGUI", this);
        Globals.eventBus.subscribe("PickerDidLeaveObject", this);
        Globals.eventBus.subscribe("PickerDidHitObject", this);
        Globals.eventBus.subscribe("DidSelectSegmentIndex", this);
    }

    receiveEvent({ type, data }) {

        if ("PickerDidHitObject" === type) {

            const objectUUID = data;
            if (Globals.ballAndStick.objectSegmentDictionary[ objectUUID ]) {
                const segmentIndex = Globals.ballAndStick.objectSegmentDictionary[ objectUUID ].segmentID;
                this.highlight([segmentIndex])
            }

        } else if ("PickerDidLeaveObject" === type) {

            this.repaint();

        } else if ("DidSelectSegmentIndex" === type) {

            this.highlight(data.segmentIndexList);

        } else if (Globals.sceneManager && "DidLeaveGUI" === type) {

            this.repaint();

        }
    }

    repaint () {
        this.paintQuantizedRamp(undefined);
    }

    onCanvasMouseMove(canvas, event) {

        if (undefined === Globals.ensembleManager.maximumSegmentID) {
            return;
        }

        let { yNormalized } = getMouseXY(canvas, event);

        // 0 to 1. Flip direction.
        const segmentIndex = segmentIndexForInterpolant(1.0 - yNormalized, Globals.ensembleManager.maximumSegmentID);

        this.highlight([ segmentIndex ]);

        if (currentSegmentIndex !== segmentIndex) {
            currentSegmentIndex = segmentIndex;
            Globals.eventBus.post({type: "DidSelectSegmentIndex", data: { segmentIndexList: [ segmentIndex ] } });
        }

    };

    highlight(segmentIndexList) {
        this.paintQuantizedRamp(new Set(segmentIndexList))
    }

    paintQuantizedRamp(highlightedSegmentIndexSet){

        if (undefined === Globals.ensembleManager.maximumSegmentID) {
            return;
        }

        const { offsetHeight: height, offsetWidth: width } = this.rgb_ctx.canvas;

        let interpolant;
        let quantizedInterpolant;
        let segmentIndex;

        // paint rgb ramp
        for (let y = 0;  y < height; y++) {
            interpolant = 1 - (y / (height - 1));
            quantizedInterpolant = quantize(interpolant, Globals.ensembleManager.maximumSegmentID);
            segmentIndex = segmentIndexForInterpolant(interpolant, Globals.ensembleManager.maximumSegmentID);
            this.rgb_ctx.fillStyle = Globals.colorMapManager.retrieveRGB255String(defaultColormapName, quantizedInterpolant);
            this.rgb_ctx.fillRect(0, y, width, 1);
        }

        // clear highlight canvas
        this.highlight_ctx.clearRect(0, 0, width, height);

        // paint alpha map opacque
        this.alphamap_ctx.fillStyle = alpha_visible;
        this.alphamap_ctx.fillRect(0, 0, width, height);

        if (highlightedSegmentIndexSet) {

            // set highlight color
            this.highlight_ctx.fillStyle = this.highlightColor;

            // paint alpha map transparent
            this.alphamap_ctx.clearRect(0, 0, width, height);

            // set opaque color
            this.alphamap_ctx.fillStyle = alpha_visible;

            for (let y = 0;  y < height; y++) {

                interpolant = 1 - (y / (height - 1));
                quantizedInterpolant = quantize(interpolant, Globals.ensembleManager.maximumSegmentID);
                segmentIndex = segmentIndexForInterpolant(interpolant, Globals.ensembleManager.maximumSegmentID);

                if (highlightedSegmentIndexSet.has(segmentIndex)) {
                    this.highlight_ctx.fillRect(0, y, width, 1);
                    this.alphamap_ctx.fillRect(0, y, width, 1);
                }

            } // for (y)

        } // if (highlightedSegmentIndexSet)

    }

    colorForInterpolant(interpolant) {
        return Globals.colorMapManager.retrieveRGBThreeJS(defaultColormapName, interpolant)
    }

    colorForSegmentID(segmentID) {
        return appleCrayonColorThreeJS('strawberry');
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

export default ColorRampMaterialProvider;
