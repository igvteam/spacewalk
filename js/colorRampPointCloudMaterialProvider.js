import Globals from './globals.js';
import { fitToContainer, getMouseXY } from "./utils.js";
import { rgb255, rgb255String, appleCrayonColorRGB255 } from "./color.js";
import { defaultColormapName } from "./colorMapManager.js";
import PointCloud from './pointCloud.js';

let currentInterpolantWindow = undefined;

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

            if (Globals.sceneManager.renderStyle === PointCloud.getRenderStyle()) {
                this.onCanvasMouseMove(canvas, event)
            }

        });

        $canvasContainer.on(('mouseenter.' + namespace), (event) => {
            event.stopPropagation();
            currentInterpolantWindow = undefined;
        });

        $canvasContainer.on(('mouseleave.' + namespace), (event) => {

            event.stopPropagation();

            currentInterpolantWindow = undefined;

            if (Globals.sceneManager.renderStyle === PointCloud.getRenderStyle()) {
                this.repaint();
                Globals.pointCloud.unHighlight();
            }

        });

        // soak up misc events
        let eventSink = e => { e.stopPropagation(); };
        $canvasContainer.on(('mouseup.' + namespace), eventSink);
        $canvasContainer.on(('mousedown.' + namespace), eventSink);
        $canvasContainer.on(('click.' + namespace), eventSink);

        const { r, g, b } = highlightColor;
        this.highlightColor = rgb255String( rgb255(r*255, g*255, b*255) );

    }

    configureWithInterpolantWindowList(interpolantWindowList) {
        this.interpolantWindowList = interpolantWindowList;
        this.repaint();
    }

    repaint () {

        const { offsetHeight: height, offsetWidth: width } = this.rgb_ctx.canvas;

        this.highlight_ctx.clearRect(0, 0, width, height);

        this.rgb_ctx.fillStyle = rgb255String(appleCrayonColorRGB255('snow'));
        this.rgb_ctx.fillRect(0, 0, width, height);

        for (let y = 0; y < height; y++) {

            const interpolant = 1 - (y / (height - 1));
            this.rgb_ctx.fillStyle = Globals.colorMapManager.retrieveRGB255String(defaultColormapName, interpolant);
            this.rgb_ctx.fillRect(0, y, width, 1);
        }

    }

    onCanvasMouseMove(canvas, event) {

        let { yNormalized } = getMouseXY(canvas, event);
        this.highlight(1 - yNormalized);
    };

    highlight(interpolant) {

        let minimalWindow = undefined;
        for (let interpolantWindow of this.interpolantWindowList) {

            const { start, end, sizeBP } = interpolantWindow;

            if (interpolant < start || interpolant > end) {
                // do nothing
            } else {

                if (undefined === minimalWindow) {
                    minimalWindow = interpolantWindow;
                } else if (sizeBP < minimalWindow.sizeBP) {
                    minimalWindow = interpolantWindow;
                }

            }

        }

        if (minimalWindow && currentInterpolantWindow !== minimalWindow) {

            currentInterpolantWindow = minimalWindow;

            const { start, end, geometryUUID } = minimalWindow;

            const { offsetHeight: height, offsetWidth: width } = this.highlight_ctx.canvas;

            this.highlight_ctx.clearRect(0, 0, width, height);

            this.highlight_ctx.fillStyle = this.highlightColor;

            const h = Math.round((end - start) * height);
            const y = Math.round(start * height);

            const yy = height - (h + y);

            this.highlight_ctx.fillRect(0, yy, width, h);

            Globals.pointCloud.highlight(geometryUUID);

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
