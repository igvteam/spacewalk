import Globals from './globals.js';
import { fitToContainer, getMouseXY } from "./utils.js";
import { rgb255, rgb255String } from "./color.js";
import { defaultColormapName } from "./colorMapManager.js";

let currentSegmentIndex = undefined;

const alpha_visible = `rgb(${255},${255},${255})`;

let rgbTexture;
let alphaTexture;
class ColorRampPointCloudMaterialProvider {

    constructor({ $canvasContainer, highlightColor }) {

        let canvas;

        // highlight canvas
        canvas = $canvasContainer.find('#spacewalk_color_ramp_point_cloud_canvas_highlight').get(0);
        fitToContainer(canvas);
        this.highlight_ctx = canvas.getContext('2d');

        // ramp rgb canvas
        canvas = $canvasContainer.find('#spacewalk_color_ramp_point_cloud_canvas_rgb').get(0);
        fitToContainer(canvas);
        this.rgb_ctx = canvas.getContext('2d');

        const namespace = 'color-ramp-point-cloud-material-provider';

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
    }

    receiveEvent({ type, data }) {

        if (Globals.sceneManager && "DidLeaveGUI" === type) {
            this.repaint();
        }
    }

    configureWithInterpolantWindowList(interpolantWindowList) {
        this.interpolantWindowList = interpolantWindowList;
        this.paintQuantizedRamp(undefined);
    }

    repaint () {

        if (this.interpolantWindowList) {
            this.paintQuantizedRamp(undefined);
        }

    }

    onCanvasMouseMove(canvas, event) {

        let { yNormalized } = getMouseXY(canvas, event);

        this.highlight(1 - yNormalized);

    };

    highlight(interpolant) {
        this.paintQuantizedRamp(interpolant)
    }

    paintQuantizedRamp(highlightInterpolant){

        const { offsetHeight: height, offsetWidth: width } = this.rgb_ctx.canvas;

        // paint rgb ramp
        for (let y = 0;  y < height; y++) {

            const percent = 1 - (y / (height - 1));

            for (let interpolantWindow of this.interpolantWindowList) {

                const { start, end, interpolant } = interpolantWindow;

                if (percent < start || percent > end) {
                    // do nothing
                } else {
                    this.rgb_ctx.fillStyle = Globals.colorMapManager.retrieveRGB255String(defaultColormapName, interpolant);
                    this.rgb_ctx.fillRect(0, y, width, 1);
                }
            }

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

export default ColorRampPointCloudMaterialProvider;
