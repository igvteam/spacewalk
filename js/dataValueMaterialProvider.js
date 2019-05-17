import * as THREE from "../node_modules/three/build/three.module.js";
import { globalEventBus } from "./eventBus.js";
import { rgb255, rgb255Lerp, rgb255String, appleCrayonColorThreeJS, greyScale255 } from './color.js';
import { sceneManager } from "./main.js";

let rgbTexture;
let alphaTexture;

const alpha_visible = `rgb(${255},${255},${255})`;
const rgb_missing_feature = rgb255String(greyScale255(250));

const diagnosticColor = appleCrayonColorThreeJS('strawberry');
class DataValueMaterialProvider {

    constructor ({ width, height, colorMinimum, colorMaximum, highlightColor }) {
        let canvas;

        // rgb
        canvas = document.createElement('canvas');
        this.rgb_ctx = canvas.getContext('2d');
        configureCanvas(this.rgb_ctx, width, height);

        // alpha
        canvas = document.createElement('canvas');
        this.alpha_ctx = canvas.getContext('2d');
        configureCanvas(this.alpha_ctx, width, height);


        // rgb
        rgbTexture = new THREE.CanvasTexture(this.rgb_ctx.canvas);
        // rgbTexture.center.set(0.5, 0.5);
        // rgbTexture.rotation = Math.PI/2.0;
        rgbTexture.minFilter = rgbTexture.magFilter = THREE.NearestFilter;

        // alpha
        alphaTexture = new THREE.CanvasTexture(this.alpha_ctx.canvas);
        // alphaTexture.center.set(0.5, 0.5);
        // alphaTexture.rotation = Math.PI/2.0;
        alphaTexture.minFilter = alphaTexture.magFilter = THREE.NearestFilter;

        let material = new THREE.MeshPhongMaterial({ map: rgbTexture, alphaMap: alphaTexture });
        material.alphaTest = 0.5;
        material.side = THREE.DoubleSide;
        material.transparent = true;

        this.material = material;

        this.colorMinimum = colorMinimum;
        this.colorMaximum = colorMaximum;

        const { r, g, b } = highlightColor;
        this.highlightColor = rgb255String( rgb255(r*255, g*255, b*255) );

        this.featureRects = undefined;

        globalEventBus.subscribe("DidLeaveGUI", this);
        globalEventBus.subscribe("DidSelectSegmentIndex", this);
    }

    receiveEvent({ type, data }) {

        if ("DidSelectSegmentIndex" === type) {

            const { interpolantList } = data;
            this.highlight(interpolantList);

        } else if (sceneManager && "DidLeaveGUI" === type) {

            let { featureRects } = this;
            this.paint({ featureRects, interpolantList: undefined });

        }
    }

    highlight(interpolantList) {

        if (undefined === this.structureLength) {
            return;
        }

        let { featureRects } = this;
        this.paint({ featureRects, interpolantList });
    }

    configure({ startBP, endBP, features, min, max }) {

        if (undefined === this.structureLength) {
            return;
        }

        this.startBP = startBP;
        this.endBP = endBP;
        this.features = features;
        this.min = min;
        this.max = max;

        if (features) {
            this.featureRects = this.createFeatureRectList({ startBP, endBP, features, min, max });
        }

        let { featureRects } = this;
        this.paint({ featureRects, interpolantList: undefined });
    }

    createFeatureRectList({ startBP, endBP, features, min, max }) {

        let list = [];
        let hits = {};
        const bpp = (endBP - startBP) / this.rgb_ctx.canvas.width;

        for (let feature of features) {

            let { start: fsBP, end: feBP, value } = feature;

            if (feBP < startBP) {
                continue;
            } else if (fsBP > endBP) {
                continue;
            }

            fsBP = Math.max(startBP, fsBP);
            feBP = Math.min(  endBP, feBP);

            let startPixel = (fsBP - startBP) / bpp;
            let   endPixel = (feBP - startBP) / bpp;
            let widthPixel = endPixel - startPixel;

            let interpolant = (value - min) / (max - min);

            const { r, g, b } = rgb255Lerp(this.colorMinimum, this.colorMaximum, interpolant);
            let fillStyle = rgb255String({ r, g, b });

            startPixel = Math.round(startPixel);
            widthPixel = Math.round(widthPixel);

            const key = startPixel.toString();

            if (undefined === hits[ key ]) {
                hits[ key ] = value;
                list.push( { startPixel, widthPixel, value, fillStyle } )

            } else if (hits[ key ] && value > hits[ key ]) {
                hits[ key ] = value;
                list.push( { startPixel, widthPixel, value, fillStyle } )
            }

        }

        return list;
    }

    paint({ featureRects, interpolantList }) {

        if (undefined === featureRects || 0 === featureRects.length) {
            return;
        }

        // Initialize rgb to transparent. Paint color where features exist.
        // this.rgb_ctx.clearRect(0, 0, this.rgb_ctx.canvas.width, this.rgb_ctx.canvas.height);

        // Initialize rgb to rgb_missing_feature
        this.rgb_ctx.fillStyle = rgb_missing_feature;
        this.rgb_ctx.fillRect(0, 0, this.rgb_ctx.canvas.width, this.rgb_ctx.canvas.height);

        this.alpha_ctx.fillStyle = alpha_visible;
        this.alpha_ctx.fillRect(0, 0, this.alpha_ctx.canvas.width, this.alpha_ctx.canvas.height);

        // Initialize alpha to transparent. Make opaque where features exist.
        // this.alpha_ctx.clearRect(0, 0, this.alpha_ctx.canvas.width, this.alpha_ctx.canvas.height);

        for (let featureRect of featureRects) {

            const { startPixel, widthPixel, fillStyle } = featureRect;

            this.rgb_ctx.fillStyle = fillStyle;
            this.rgb_ctx.fillRect(startPixel, 0, widthPixel, this.rgb_ctx.canvas.height);

            // fillStyle is alpha_visible
            // this.alpha_ctx.fillRect(startPixel, 0, widthPixel, this.alpha_ctx.canvas.height);

        }

        if (interpolantList) {

            this.rgb_ctx.fillStyle = this.highlightColor;
            this.alpha_ctx.fillStyle = alpha_visible;

            for (let interpolant of interpolantList) {
                const x = Math.round(interpolant * this.rgb_ctx.canvas.width);
                this.rgb_ctx.fillRect(x, 0, 1, this.rgb_ctx.canvas.height);
                this.alpha_ctx.fillRect(x, 0, 1, this.alpha_ctx.canvas.height);
            }
        }

    }

    colorForInterpolant(interpolant) {
        // const { r, g, b } = this.colorMinimum;
        // const color = BallAndStick.getRenderStyle() === sceneManager.renderStyle ? sceneManager.stickMaterial.color : rgb255ToThreeJSColor(r, g, b);
        return sceneManager.stickMaterial.color;
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

let configureCanvas = (ctx, width, height) => {

    ctx.canvas.width = width * window.devicePixelRatio;
    ctx.canvas.height = height * window.devicePixelRatio;

    ctx.canvas.style.width = width + 'px';
    ctx.canvas.style.height = height + 'px';

};

export default DataValueMaterialProvider;
