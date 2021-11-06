import SpacewalkEventBus from './spacewalkEventBus.js'
import * as THREE from "three";
import EnsembleManager from "./ensembleManager.js";
import { fitToContainer, getMouseXY } from "./utils.js";
import { rgb255, rgb255String, appleCrayonColorRGB255 } from "./color.js";
import { defaultColormapName } from "./colorMapManager.js";
import { colorMapManager, ensembleManager } from "./app.js";

const alpha_visible = `rgb(${255},${255},${255})`;

let rgbTexture;
let alphaTexture;
class ColorRampMaterialProvider {

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
            this.onCanvasMouseMove(canvas, event);
        });

        $canvasContainer.on(('mouseenter.' + namespace), (event) => {
            event.stopPropagation();
            SpacewalkEventBus.globalBus.post({ type: 'DidEnterGenomicNavigator', data: 'DidEnterGenomicNavigator' });
        });

        $canvasContainer.on(('mouseleave.' + namespace), (event) => {
            event.stopPropagation();
            SpacewalkEventBus.globalBus.post({ type: 'DidLeaveGenomicNavigator', data: 'DidLeaveGenomicNavigator' });
            this.repaint();
        });

        // soak up misc events
        let eventSink = e => { e.stopPropagation(); };
        $canvasContainer.on(('mouseup.' + namespace), eventSink);
        $canvasContainer.on(('mousedown.' + namespace), eventSink);
        $canvasContainer.on(('click.' + namespace), eventSink);

        const { r, g, b } = highlightColor;
        this.highlightColor = rgb255String( rgb255(r*255, g*255, b*255) );

        SpacewalkEventBus.globalBus.subscribe("DidUpdateGenomicInterpolant", this);
        SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this);
    }

    receiveEvent({ type, data }) {

        if ("DidUpdateGenomicInterpolant" === type) {

            const { poster, interpolantList } = data

            if (this !== poster) {

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

        const { offsetHeight: height, offsetWidth: width } = this.rgb_ctx.canvas;

        // clear highlight canvas
        this.highlight_ctx.clearRect(0, 0, width, height);

        // paint alpha map opaque
        this.alphamap_ctx.fillStyle = alpha_visible;
        this.alphamap_ctx.fillRect(0, 0, width, height);

        if (interpolantWindowList) {

            // set highlight color
            this.highlight_ctx.fillStyle = this.highlightColor;

            // paint alpha map transparent
            this.alphamap_ctx.clearRect(0, 0, width, height);

            // set opaque color
            this.alphamap_ctx.fillStyle = alpha_visible;

            for (let interpolantWindow of interpolantWindowList) {

                const { start, end } = interpolantWindow;
                const h = Math.round((end - start) * height);
                const y = Math.round(start * height);

                const yy = height - (h + y);

                const h_rendered = Math.max(1, h);
                this.highlight_ctx.fillRect(0, yy, width, h_rendered);
                this.alphamap_ctx.fillRect(0, yy, width, h_rendered);

            }

        }

    }

    repaint(){

        if (undefined === ensembleManager.currentTrace) {
            return;
        }

        const { offsetHeight: height, offsetWidth: width } = this.rgb_ctx.canvas;

        this.rgb_ctx.fillStyle = rgb255String( appleCrayonColorRGB255('snow') );
        this.rgb_ctx.fillRect(0, 0, width, height);

        const colorRampInterpolantWindows = Object.values(ensembleManager.currentTrace).map(({ colorRampInterpolantWindow }) => colorRampInterpolantWindow);

        for (let { interpolant, start, end } of colorRampInterpolantWindows) {

            this.rgb_ctx.fillStyle = colorMapManager.retrieveRGB255String(defaultColormapName, interpolant);

            const h = Math.ceil((end - start) * height);
            const y = Math.round(start * (height));

            const yy = Math.max(0, height - (h + y));

            this.rgb_ctx.fillRect(0, yy, width, h);
        }

        // clear highlight canvas
        this.highlight_ctx.clearRect(0, 0, width, height);

        // paint alpha map opaque
        this.alphamap_ctx.fillStyle = alpha_visible;
        this.alphamap_ctx.fillRect(0, 0, width, height);

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
