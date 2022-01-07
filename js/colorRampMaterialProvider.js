import SpacewalkEventBus from './spacewalkEventBus.js'
import EnsembleManager from "./ensembleManager.js";
import { fitToContainer, getMouseXY } from "./utils.js";
import { rgb255, rgb255String, appleCrayonColorRGB255 } from "./color.js";
import { defaultColormapName } from "./colorMapManager.js";
import {colorMapManager, ensembleManager, sceneManager} from "./app.js";
import Ribbon from './ribbon.js';

const alpha_visible = `rgb(${255},${255},${255})`;

let rgbTexture;
let alphaTexture;
class ColorRampMaterialProvider {

    constructor({ canvasContainer, highlightColor }) {

        let canvas

        // highlight canvas
        canvas = canvasContainer.querySelector('#spacewalk_color_ramp_canvas_highlight')
        fitToContainer(canvas)
        this.highlight_ctx = canvas.getContext('2d')

        // color ramp canvas
        canvas = canvasContainer.querySelector('#spacewalk_color_ramp_canvas_rgb')
        fitToContainer(canvas)
        this.rgb_ctx = canvas.getContext('2d')

        const namespace = 'color-ramp-material-provider'

        canvasContainer.addEventListener('mousemove', event => {
            event.stopPropagation()
            this.onCanvasMouseMove(canvas, event)
        });

        canvasContainer.addEventListener('mouseenter', event => {
            event.stopPropagation()
            SpacewalkEventBus.globalBus.post({ type: 'DidEnterGenomicNavigator', data: 'DidEnterGenomicNavigator' })
        });

        canvasContainer.addEventListener('mouseleave', event => {
            event.stopPropagation()
            SpacewalkEventBus.globalBus.post({ type: 'DidLeaveGenomicNavigator', data: 'DidLeaveGenomicNavigator' })
            this.repaint()
        });

        const { r, g, b } = highlightColor
        this.highlightColor = rgb255String( rgb255(r*255, g*255, b*255) )

        SpacewalkEventBus.globalBus.subscribe("DidUpdateGenomicInterpolant", this)
        SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this)
    }

    receiveEvent({ type, data }) {

        if ("DidUpdateGenomicInterpolant" === type) {

            const { poster, interpolantList } = data

            if (this !== poster || sceneManager.renderStyle === Ribbon.getRenderStyle()) {

                const interpolantWindowList = EnsembleManager.getInterpolantWindowList({ trace: ensembleManager.currentTrace, interpolantList });

                if (interpolantWindowList) {
                    this.highlightWithInterpolantWindowList(interpolantWindowList.map(({ colorRampInterpolantWindow }) => { return colorRampInterpolantWindow }));
                }

            }

        } else if ('DidLoadEnsembleFile' === type) {
            this.repaint()
        }
    }

    onCanvasMouseMove(canvas, event) {

        if (ensembleManager.currentTrace) {

            let { yNormalized } = getMouseXY(canvas, event);
            const interpolantList = [ 1.0 - yNormalized ];

            const interpolantWindowList = EnsembleManager.getInterpolantWindowList({ trace: ensembleManager.currentTrace, interpolantList });

            if (interpolantWindowList) {

                // Rely on pickerHighlighter.highlight() to call this.highlightWithInterpolantWindowList()
                SpacewalkEventBus.globalBus.post({ type: 'DidUpdateGenomicInterpolant', data: { poster: this, interpolantList } });
            }

        }

    };

    highlightWithInterpolantWindowList(interpolantWindowList) {

        if (interpolantWindowList) {
            this.paintWithInterpolantWindowList(interpolantWindowList);
        }

    }

    paintWithInterpolantWindowList(interpolantWindowList) {

        if (undefined === ensembleManager.currentTrace) {
            return;
        }

        // clear highlight canvas
        this.highlight_ctx.clearRect(0, 0, this.highlight_ctx.canvas.width, this.highlight_ctx.canvas.height);

        if (interpolantWindowList) {

            // set highlight color
            this.highlight_ctx.fillStyle = this.highlightColor;

            for (let interpolantWindow of interpolantWindowList) {

                const { start, end } = interpolantWindow;
                const h = Math.round((end - start) * this.highlight_ctx.canvas.height);
                const y = Math.round(start * this.highlight_ctx.canvas.height);

                const yy = this.highlight_ctx.canvas.height - (h + y);

                const h_rendered = Math.max(1, h);
                this.highlight_ctx.fillRect(0, yy, this.highlight_ctx.canvas.width, h_rendered);

            }

        }

    }

    resize() {
        fitToContainer(this.highlight_ctx.canvas)
        fitToContainer(this.rgb_ctx.canvas)
        this.repaint()
    }

    repaint(){

        if (undefined === ensembleManager.currentTrace) {
            return;
        }

        // repaint color ramp
        this.rgb_ctx.fillStyle = rgb255String( appleCrayonColorRGB255('snow') );
        this.rgb_ctx.fillRect(0, 0, this.rgb_ctx.canvas.width, this.rgb_ctx.canvas.height);

        const colorRampInterpolantWindows = Object.values(ensembleManager.currentTrace).map(({ colorRampInterpolantWindow }) => colorRampInterpolantWindow);

        for (let { interpolant, start, end } of colorRampInterpolantWindows) {

            this.rgb_ctx.fillStyle = colorMapManager.retrieveRGB255String(defaultColormapName, interpolant);

            const h = Math.ceil((end - start) * this.rgb_ctx.canvas.height);
            const y = Math.round(start * (this.rgb_ctx.canvas.height));

            const yy = Math.max(0, this.rgb_ctx.canvas.height - (h + y));

            this.rgb_ctx.fillRect(0, yy, this.rgb_ctx.canvas.width, h);
        }

        // clear highlight canvas
        this.highlight_ctx.clearRect(0, 0, this.highlight_ctx.canvas.width, this.highlight_ctx.canvas.height);
    }

    colorForInterpolant(interpolant) {
        return colorMapManager.retrieveRGBThreeJS(defaultColormapName, interpolant)
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

export default ColorRampMaterialProvider;
