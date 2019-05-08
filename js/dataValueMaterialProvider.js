import * as THREE from "./threejs_es6/three.module.js";
import { rgbRandom255, rgb255Lerp, rgb255String, appleCrayonColorThreeJS, appleCrayonColorRGB255, rgb255ToThreeJSColor } from './color.js';

let rgbTexture;
let alphaTexture;

const alpha_visible = `rgb(${255},${255},${255})`;

const missingDataColor = rgb255String(appleCrayonColorRGB255('nickel'));

class DataValueMaterialProvider {

    constructor ({ width, height, colorMinimum, colorMaximum }) {
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
    }

    configure({ startBP, endBP, features, min, max, structureLength }) {

        this.structureLength = structureLength;

        if (undefined === features) {
            return;
        }

        // paint alpha map opaque
        this.alpha_ctx.fillStyle = alpha_visible;
        this.alpha_ctx.fillRect(0, 0, this.alpha_ctx.canvas.width, this.alpha_ctx.canvas.height);

        // initialize rgb map to color indicating no data
        this.rgb_ctx.fillStyle = missingDataColor;
        this.rgb_ctx.fillRect(0, 0, this.rgb_ctx.canvas.width, this.rgb_ctx.canvas.height);

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
