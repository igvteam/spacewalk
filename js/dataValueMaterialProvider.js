import * as THREE from "../node_modules/three/build/three.module.js";
import { rgb255, rgb255Lerp, rgb255String, greyScale255, rgb255ToThreeJSColor } from './color.js';
import { eventBus, ensembleManager, sceneManager } from "./app.js";

let rgbTexture;
let alphaTexture;

const alpha_visible = `rgb(${255},${255},${255})`;
const rgb255MissingFeature = greyScale255(250);

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

        eventBus.subscribe("DidLeaveGUI", this);
        eventBus.subscribe("DidSelectSegmentID", this);
    }

    receiveEvent({ type, data }) {

        if ("DidSelectSegmentID" === type) {

            const { interpolantList } = data;
            this.highlight(interpolantList);

        } else if (sceneManager && "DidLeaveGUI" === type) {

            let { featureRects } = this;
            this.paint({ featureRects, interpolantList: undefined });

        }
    }

    highlight(interpolantList) {

        if (undefined === ensembleManager.maximumSegmentID) {
            return;
        }

        let { featureRects } = this;
        this.paint({ featureRects, interpolantList });
    }

    configure({ startBP, endBP, features, min, max }) {

        if (undefined === ensembleManager.maximumSegmentID) {
            return;
        }

        this.startBP = startBP;
        this.endBP = endBP;
        this.features = features;
        this.min = min;
        this.max = max;

        this.featureRects = undefined;

        if (features) {
            this.featureRects = this.createFeatureRectList({ startBP, endBP, features, min, max });
        }

        let { featureRects } = this;
        this.paint({ featureRects, interpolantList: undefined });
    }

    createFeatureRectList({ startBP, endBP, features, min, max }) {

        let list = [];
        let hitList = {};
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


            let widthPixel;
            let interpolant;
            if (undefined === min && undefined === max) {
                interpolant = 1;
                widthPixel = Math.max(1, endPixel - startPixel);
            } else {
                interpolant = (value - min) / (max - min);
                widthPixel = endPixel - startPixel;
            }

            const { r, g, b } = rgb255Lerp(this.colorMinimum, this.colorMaximum, interpolant);
            let fillStyle = rgb255String({ r, g, b });

            startPixel = Math.round(startPixel);
            widthPixel = Math.round(widthPixel);

            const key = startPixel.toString();

            if (undefined === hitList[ key ]) {
                hitList[ key ] = value;
                list.push( { startPixel, widthPixel, value, fillStyle } )

            } else if (hitList[ key ] && Math.abs(value) > Math.abs(hitList[ key ])) {
                hitList[ key ] = value;
                list.push( { startPixel, widthPixel, value, fillStyle } )
            }

        }

        return list;
    }

    paint({ featureRects, interpolantList }) {

        // if (undefined === featureRects || 0 === featureRects.length) {
        //     return;
        // }

        // Initialize rgb to transparent. Paint color where features exist.
        // this.rgb_ctx.clearRect(0, 0, this.rgb_ctx.canvas.width, this.rgb_ctx.canvas.height);

        // Initialize rgb to rgb255MissingFeature
        this.rgb_ctx.fillStyle = rgb255String(rgb255MissingFeature);
        this.rgb_ctx.fillRect(0, 0, this.rgb_ctx.canvas.width, this.rgb_ctx.canvas.height);

        this.alpha_ctx.fillStyle = alpha_visible;
        this.alpha_ctx.fillRect(0, 0, this.alpha_ctx.canvas.width, this.alpha_ctx.canvas.height);

        // Initialize alpha to transparent. Make opaque where features exist.
        // this.alpha_ctx.clearRect(0, 0, this.alpha_ctx.canvas.width, this.alpha_ctx.canvas.height);

        if (undefined === featureRects) {
            return;
        }

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

        const x = Math.round(interpolant * this.rgb_ctx.canvas.width);
        const y = Math.floor( 0.5 * this.alpha_ctx.canvas.height);

        const { data } = this.rgb_ctx.getImageData(x, y, 1, 1);

        return rgb255ToThreeJSColor(data[ 0 ], data[ 1 ], data[ 2 ])

        // return sceneManager.stickMaterial.color;
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

const colorForGenomicLocation = ({ startBP, endBP, features, min, max, colorMinimum, colorMaximum }) => {

    let rgb255 = undefined;

    if (features) {

        let maxValue = 0;
        for (let feature of features) {

            let { start: fsBP, end: feBP, value } = feature;

            if (feBP < startBP) {
                continue;
            } else if (fsBP > endBP) {
                continue;
            }

            fsBP = Math.max(startBP, fsBP);
            feBP = Math.min(  endBP, feBP);

            if (undefined === min && undefined === max) {
                rgb255 = colorMaximum;
            } else if (Math.abs(value) > Math.abs(maxValue)) {
                maxValue = value;
                const interpolant = (value - min) / (max - min);
                rgb255 = rgb255Lerp(colorMinimum, colorMaximum, interpolant);
            }

        }

    }

    return rgb255 || rgb255MissingFeature;
};

const configureCanvas = (ctx, width, height) => {

    ctx.canvas.width = width;
    ctx.canvas.height = height;

    // ctx.canvas.width = width * window.devicePixelRatio;
    // ctx.canvas.height = height * window.devicePixelRatio;

    // ctx.canvas.style.width = width + 'px';
    // ctx.canvas.style.height = height + 'px';

};

export default DataValueMaterialProvider;
