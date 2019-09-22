import * as THREE from "../node_modules/three/build/three.module.js";
import { segmentIDForInterpolant, fitToContainer, getMouseXY } from "./utils.js";
import { quantize } from "./math.js";
import { rgb255, rgb255String } from "./color.js";
import { defaultColormapName } from "./colorMapManager.js";
import PointCloud from "./pointCloud.js";
import { globals } from "./app.js";

let currentSegmentIndex = undefined;

const alpha_visible = `rgb(${255},${255},${255})`;

let rgbTexture;
let alphaTexture;
class TraceColorRampMaterialProvider {

    constructor({ $canvasContainer, highlightColor }) {

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

        const namespace = 'color-ramp-material-provider';

        $canvasContainer.on(('mousemove.' + namespace), (event) => {

            event.stopPropagation();

            if (globals.sceneManager.renderStyle !== PointCloud.getRenderStyle()) {
                this.onCanvasMouseMove(canvas, event)
            }

        });

        $canvasContainer.on(('mouseenter.' + namespace), (event) => {
            event.stopPropagation();
            currentSegmentIndex = undefined;
        });

        $canvasContainer.on(('mouseleave.' + namespace), (event) => {

            event.stopPropagation();

            if (globals.sceneManager.renderStyle !== PointCloud.getRenderStyle()) {
                currentSegmentIndex = undefined;
                this.repaint();
            }
        });

        // soak up misc events
        let eventSink = e => { e.stopPropagation(); };
        $canvasContainer.on(('mouseup.' + namespace), eventSink);
        $canvasContainer.on(('mousedown.' + namespace), eventSink);
        $canvasContainer.on(('click.' + namespace), eventSink);

        const { r, g, b } = highlightColor;
        this.highlightColor = rgb255String( rgb255(r*255, g*255, b*255) );


        globals.eventBus.subscribe("DidLeaveGUI", this);
        globals.eventBus.subscribe("PickerDidLeaveObject", this);
        globals.eventBus.subscribe("PickerDidHitObject", this);
        globals.eventBus.subscribe("DidSelectSegmentID", this);
    }

    receiveEvent({ type, data }) {

        if ("PickerDidHitObject" === type) {

            const objectUUID = data;
            if (globals.ballAndStick.meshUUID_ColorRampInterpolantWindow_Dictionary[ objectUUID ]) {
                const { segmentID } = globals.ballAndStick.meshUUID_ColorRampInterpolantWindow_Dictionary[ objectUUID ];
                this.highlight([ segmentID ])
            }

        } else if ("PickerDidLeaveObject" === type) {

            this.repaint();

        } else if ("DidSelectSegmentID" === type) {

            this.highlight(data.segmentIDList);

        } else if (globals.sceneManager && "DidLeaveGUI" === type) {

            this.repaint();

        }
    }

    repaint () {
        this.paintQuantizedRamp(undefined);
    }

    onCanvasMouseMove(canvas, event) {

        if (undefined === globals.ensembleManager.maximumSegmentID) {
            return;
        }

        let { yNormalized } = getMouseXY(canvas, event);

        // 0 to 1. Flip direction.
        const segmentID = segmentIDForInterpolant(1.0 - yNormalized);

        this.highlight([ segmentID ]);

        if (currentSegmentIndex !== segmentID) {
            currentSegmentIndex = segmentID;
            globals.eventBus.post({type: "DidSelectSegmentID", data: { segmentIDList: [ segmentID ] } });
        }

    };

    highlight(segmentIDList) {
        this.paintQuantizedRamp(new Set(segmentIDList))
    }

    paintQuantizedRamp(highlightedSegmentIDSet){

        if (undefined === globals.ensembleManager.maximumSegmentID) {
            return;
        }

        const { offsetHeight: height, offsetWidth: width } = this.rgb_ctx.canvas;

        let interpolant;
        let quantizedInterpolant;

        // paint rgb ramp
        for (let y = 0;  y < height; y++) {
            interpolant = 1 - (y / (height - 1));
            quantizedInterpolant = quantize(interpolant, globals.ensembleManager.maximumSegmentID);
            this.rgb_ctx.fillStyle = globals.colorMapManager.retrieveRGB255String(defaultColormapName, quantizedInterpolant);
            this.rgb_ctx.fillRect(0, y, width, 1);
        }

        // clear highlight canvas
        this.highlight_ctx.clearRect(0, 0, width, height);

        // paint alpha map opacque
        this.alphamap_ctx.fillStyle = alpha_visible;
        this.alphamap_ctx.fillRect(0, 0, width, height);

        if (highlightedSegmentIDSet) {

            // set highlight color
            this.highlight_ctx.fillStyle = this.highlightColor;

            // paint alpha map transparent
            this.alphamap_ctx.clearRect(0, 0, width, height);

            // set opaque color
            this.alphamap_ctx.fillStyle = alpha_visible;

            for (let y = 0;  y < height; y++) {

                interpolant = 1 - (y / (height - 1));
                quantizedInterpolant = quantize(interpolant, globals.ensembleManager.maximumSegmentID);
                const segmentID = segmentIDForInterpolant(interpolant);

                if (highlightedSegmentIDSet.has(segmentID)) {
                    this.highlight_ctx.fillRect(0, y, width, 1);
                    this.alphamap_ctx.fillRect(0, y, width, 1);
                }

            } // for (y)

        } // if (highlightedSegmentIndexSet)

    }

    colorForInterpolant(interpolant) {
        return globals.colorMapManager.retrieveRGBThreeJS(defaultColormapName, interpolant)
    }

    colorForSegment({ segmentID, genomicLocation }) {
        const interpolant = (segmentID - 1) / (globals.ensembleManager.maximumSegmentID - 1);
        return globals.colorMapManager.retrieveRGBThreeJS(defaultColormapName, interpolant)
    }

    renderLoopHelper () {

        if (rgbTexture) {
            rgbTexture.needsUpdate = true;
        }

        if (alphaTexture) {
            alphaTexture.needsUpdate = true;
        }

    }

    show() {
        $(this.highlight_ctx.canvas).show();
        $(this.rgb_ctx.canvas).show();
    }

    hide() {
        $(this.highlight_ctx.canvas).hide();
        $(this.rgb_ctx.canvas).hide();
    }
}

export default TraceColorRampMaterialProvider;
