import hic from '../../../node_modules/juicebox.js/dist/juicebox.esm.js';
import { greyScale255, rgb255String } from "../../../js/color.js";
import { StringUtils } from '../../../node_modules/igv-utils/src/index.js'

document.addEventListener("DOMContentLoaded", async (event) => {
    await main( document.getElementById('raw-root-container') );
});

const total_rows = 21;
const total_columns = 21;
const height_zstack = 100;
const numClrs = 81;
const numSpts = 234;

const MaxUint16 = 65535;
const MaxUint8 = 255;

let main = async(container) => {

    console.log('good to go');

    const request = new XMLHttpRequest();
    // request.open("GET", 'https://www.dropbox.com/s/9h2kgquu4reqv39/fov001_DataSpots.i5d?dl=0', true);
    request.open("GET", './data/fov001_DataSpots.i5d', true);
    request.responseType = "arraybuffer";

    request.onload = event => {

        // See https://javascript.info/arraybuffer-binary-arrays for excellent review of how
        // Javascript deals with binary data

        // Nice and simple unint16 array to canvas
        // https://stackoverflow.com/questions/52904045/display-image-by-using-uint16array-data

        const arrayBuffer = request.response;

        // raw bits
        let bits = new Uint16Array(arrayBuffer);
        console.log(`byte length ${ bits.byteLength }. length ${ bits.length }. bytes per element ${ bits.BYTES_PER_ELEMENT }`);

        const imageStackList = [];
        for (let t = 0; t < numClrs; t++) {

            const bitsOffset = t * total_rows * total_columns * height_zstack;
            const imageStack = [];

            for (let z = 0; z < height_zstack; z++) {

                const _start = bitsOffset + z * total_rows * total_columns;
                const _end = _start + total_rows * total_columns;

                const image = bits.slice(_start, _end);

                // const { min, max } = min_max(image);
                // console.log(`image ${ z } min ${ StringUtils.numberFormatter(min) } max ${ StringUtils.numberFormatter(max) }`);

                imageStack.push( image );

            } // for (z)

            imageStackList.push(imageStack);

        } // for (t)

        // force deletion
        bits = null;

        // remapIntensities(imageStackList);

        // composite each image stack into a single image
        const comps = [];
        for (let imageStack of imageStackList) {
            const comp = composite(imageStack)
            remapImageIntensities(comp)
            comps.push(comp)
        }


        for (let i = 0; i < comps.length; i++) {

            // const canvas = document.getElementById(`raw-canvas-${ i }`)

            const canvas = document.createElement('canvas')
            container.appendChild(canvas)

            canvas.width = total_columns
            canvas.height = total_rows

            canvas.style.width =`${ total_columns * 8 }px`
            canvas.style.height =`${ total_rows * 8 }px`

            canvas.style.backgroundColor = 'white'
            canvas.style.borderStyle = 'solid'
            canvas.style.borderWidth = 'thin'
            canvas.style.borderColor = '#535353'

            const ctx = canvas.getContext('2d')

            const scanlineImage = createScanlineImage(comps[i])
            paint(ctx, scanlineImage, true)

            // const paddedImage = createPaddedScanlineImage(comps[i], canvas.width, canvas.height)
            // paint(ctx, paddedImage)

        }

        // const paddedImageStack = [];
        // for (let rawImage of imageStackList[ 16 ]) {
        //
        //     const scanlines = new Array(canvas.height);
        //     let c;
        //     for (c = 0; c < total_columns; c++) {
        //
        //         // Empty scanline with "nice" length that works with the ImageData object
        //         const scanline = new Uint16Array(canvas.width);
        //         scanline.fill();
        //
        //         const _start = c * total_rows;
        //         const _end = _start + total_rows;
        //
        //         // We "flip" the column to be a horizonal scanline
        //         // data in the raw file is store in column-major order
        //         const oneColumn = rawImage.slice(_start, _end);
        //         scanline.set(oneColumn, 0);
        //
        //         scanlines.fill(scanline, c);
        //
        //     } // for (c)
        //
        //     // pad out scanline list
        //     while (c < scanlines.length) {
        //         const padding = new Uint16Array(canvas.width);
        //         padding.fill();
        //         scanlines.fill(padding, c);
        //         ++c;
        //     } // while(scanlines.length)
        //
        //     paddedImageStack.push(scanlines);
        //
        // } // for (rawImage)

        // paint(ctx, paddedImageStack[50])
    };

    request.send(null);


};

const paint = (ctx, scanlines, doInvert) => {

    for (let scanline of scanlines) {

        for (let rawValue of scanline) {

            const value = doInvert ? 1.0 - rawValue/MaxUint16 : rawValue/MaxUint16;
            const grey = greyScale255( Math.round( value * MaxUint8 ) );

            ctx.fillStyle = rgb255String(grey)
            ctx.fillRect(scanline.indexOf(rawValue), scanlines.indexOf(scanline), 1, 1);
        }

    }

}

const remapImageIntensities = image => {

    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY

    for (let value of image) {
        min = Math.min(min, value)
        max = Math.max(max, value)
    }

    for (let i = 0; i < image.length; i++) {
        image[ i ] = Math.floor( ((image[ i ] - min)/(max - min)) * MaxUint16 )
    }

}

const remapImageStackIntensities = imageStack => {

    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    for (let image of imageStack) {
        for (let value of image) {
            min = Math.min(min, value)
            max = Math.max(max, value)
        }
    }

    for (let image of imageStack) {
        for (let i = 0; i < image.length; i++) {
            const remapped = Math.floor( ((image[ i ] - min)/(max - min)) * MaxUint16 );
            image[ i ] = remapped;
        }
    }

}

const createScanlineImage = (rawImage) => {

    const scanlines = new Array(total_rows);

    for (let c = 0; c < total_columns; c++) {
        const _start = c * total_rows;
        const _end = _start + total_rows;
        scanlines.fill(rawImage.slice(_start, _end), c);
    }

    return scanlines;
}

const createPaddedScanlineImage = (rawImage, width, height) => {

    const scanlines = new Array(height);

    let c;
    for (c = 0; c < total_columns; c++) {

        // Empty scanline with "nice" length that works with the ImageData object
        const scanline = new Uint16Array(width);
        scanline.fill();

        const _start = c * total_rows;
        const _end = _start + total_rows;

        // We "flip" the column to be a horizonal scanline
        // data in the raw file is store in column-major order
        const oneColumn = rawImage.slice(_start, _end);
        scanline.set(oneColumn, 0);

        scanlines.fill(scanline, c);
    }

    // pad out scanline list
    while (c < scanlines.length) {
        const padding = new Uint16Array(width);
        padding.fill();
        scanlines.fill(padding, c);
        ++c;
    }

    return scanlines;
}

const composite = imageStack => {

    const any = imageStack[ imageStack.length - 1 ];

    const under = new Uint16Array(any.length);
    under.fill();

    for (let image of imageStack) {

        for (let value of image) {
            const index = image.indexOf(value);
            const alpha = value / MaxUint16;
            const f = alpha * MaxUint16 + (1.0 - alpha) * under[ index ];
            under[ index ] = Math.floor(f);
        }

    }

    return under;
}
