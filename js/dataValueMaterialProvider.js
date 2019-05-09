import * as THREE from "./threejs_es6/three.module.js";
import { globalEventBus } from "./eventBus.js";

import { rgb255, rgbRandom255, rgb255Lerp, rgb255String, appleCrayonColorThreeJS, appleCrayonColorRGB255, rgb255ToThreeJSColor } from './color.js';
import { quantize } from "./math.js";
import { segmentIndexForInterpolant } from "./utils.js";
import {sceneManager} from "./main.js";

let rgbTexture;
let alphaTexture;

const alpha_visible = `rgb(${255},${255},${255})`;

const missingDataColor = rgb255String(appleCrayonColorRGB255('mercury'));

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

        globalEventBus.subscribe("DidLeaveGUI", this);
        globalEventBus.subscribe("DidSelectSegmentIndex", this);
    }

    receiveEvent({ type, data }) {

        if ("DidSelectSegmentIndex" === type) {

            this.highlight(data);

        } else if (sceneManager && "DidLeaveGUI" === type) {

            let { startBP, endBP, features, min, max } = this;
            this.paint({ startBP, endBP, features, min, max, highlightedSegmentIndexSet: undefined });

        }
    }

    highlight(segmentIndexList) {

        if (undefined === this.structureLength) {
            return;
        }

        let { startBP, endBP, features, min, max } = this;
        this.paint({ startBP, endBP, features, min, max, highlightedSegmentIndexSet: new Set(segmentIndexList) });
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

        this.paint({ startBP, endBP, features, min, max, highlightedSegmentIndexSet: undefined });
    }

    paint({ startBP, endBP, features, min, max, highlightedSegmentIndexSet }) {

        if (undefined === features) {
            return;
        }

        // initialize rgb map to color indicating no data
        this.rgb_ctx.fillStyle = missingDataColor;
        this.rgb_ctx.fillRect(0, 0, this.rgb_ctx.canvas.width, this.rgb_ctx.canvas.height);
        // this.rgb_ctx.clearRect(0, 0, this.rgb_ctx.canvas.width, this.rgb_ctx.canvas.height);

        const bpp = (endBP - startBP) / this.rgb_ctx.canvas.width;

        this.colorTable = new Array(this.rgb_ctx.canvas.width);

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
            this.rgb_ctx.fillStyle = rgb255String({ r, g, b });
            // this.rgb_ctx.fillStyle = rgb255String(rgbRandom255(128, 255));

            startPixel = Math.round(startPixel);
            widthPixel = Math.round(widthPixel);
            this.rgb_ctx.fillRect(startPixel, 0, widthPixel, this.rgb_ctx.canvas.height);

            for (let p = startPixel; p <= endPixel; ++p) {
                this.colorTable[ p ] = rgb255ToThreeJSColor(r, g, b)
            }
        }

        const { width, height } = this.alpha_ctx.canvas;

        this.alpha_ctx.fillStyle = alpha_visible;
        this.alpha_ctx.fillRect(0, 0, width, height);

        // remove regions that have no features
        this.alpha_ctx.clearRect(0, 0, width, height);
        for (let feature of features) {

            let { start: fsBP, end: feBP } = feature;

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

            startPixel = Math.round(startPixel);
            widthPixel = Math.round(widthPixel);
            this.alpha_ctx.fillRect(startPixel, 0, widthPixel, this.alpha_ctx.canvas.height);

        }

        // paint highlight
        if (highlightedSegmentIndexSet) {

            // set highlight color
            this.rgb_ctx.fillStyle = this.highlightColor;

            let xList = [];
            for (let x = 0;  x < width; x++) {

                const interpolant = (x / (width - 1));
                const quantizedInterpolant = quantize(interpolant, this.structureLength);
                const segmentIndex = segmentIndexForInterpolant(interpolant, this.structureLength);

                if (highlightedSegmentIndexSet.has(segmentIndex)) {
                    xList.push(x);
                }

            } // for (x)

            // this.rgb_ctx.fillRect(xList[ 0 ], 0, 1, height);
            // this.rgb_ctx.fillRect(xList[ (xList.length - 1) ], 0, 1, height);

            const x_centerline = (xList[ 0 ] + xList[ (xList.length - 1) ]) >> 1;
            this.rgb_ctx.fillRect(x_centerline, 0, 1, height);

        } // if (highlightedSegmentIndexSet)

    }

    colorForInterpolant(interpolant) {
        const index = Math.floor(interpolant * (this.colorTable.length - 1));
        return this.colorTable[ index ];
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
