import * as THREE from 'three'
import { rgb255Lerp, rgb255String, greyScale255, rgb255ToThreeJSColor } from './color.js'

let rgbTexture;

const rgb255MissingFeature = greyScale255(250);

class UnusedDataValueMaterialProvider {

    constructor ({ width, height, colorMinimum, colorMaximum }) {

        const canvas = document.createElement('canvas');
        this.rgb_ctx = canvas.getContext('2d');
        configureCanvas(this.rgb_ctx, width, height);

        rgbTexture = new THREE.CanvasTexture(this.rgb_ctx.canvas);
        // rgbTexture.minFilter = rgbTexture.magFilter = THREE.NearestFilter;

        const material = new THREE.MeshPhongMaterial({ map: rgbTexture });
        material.side = THREE.DoubleSide;
        this.material = material;

        this.colorMinimum = colorMinimum;
        this.colorMaximum = colorMaximum;

        this.featureRects = undefined;
    }

    configure({ startBP, endBP, features, min, max }) {

        this.startBP = startBP
        this.endBP = endBP
        this.features = features
        this.min = min
        this.max = max

        this.featureRects = this.createFeatureRectList({ startBP, endBP, features, min, max })

        this.paint(this.featureRects)
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

        return list.length > 0 ? list : undefined
    }

    paint(featureRects) {

        // Initialize rgb to rgb255MissingFeature
        this.rgb_ctx.fillStyle = rgb255String(rgb255MissingFeature);
        this.rgb_ctx.fillRect(0, 0, this.rgb_ctx.canvas.width, this.rgb_ctx.canvas.height);


        if (featureRects) {
            for (let { startPixel, widthPixel, fillStyle } of featureRects) {
                this.rgb_ctx.fillStyle = fillStyle;
                this.rgb_ctx.fillRect(startPixel, 0, widthPixel, this.rgb_ctx.canvas.height);
            }
        }

    }

    colorForInterpolant(interpolant) {
        const x = Math.round(interpolant * this.rgb_ctx.canvas.width)
        const y = Math.floor( this.rgb_ctx.canvas.height/2)
        const { data } = this.rgb_ctx.getImageData(x, y, 1, 1)
        return rgb255ToThreeJSColor(data[ 0 ], data[ 1 ], data[ 2 ])
    }

}

function configureCanvas(ctx, width, height) {
    ctx.canvas.width = width;
    ctx.canvas.height = height;
}

export default UnusedDataValueMaterialProvider
