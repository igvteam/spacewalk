
import {appleCrayonColorRGB255, rgb255Lerp, rgb255String, rgb255ToThreeJSColor} from "./color.js";
import { createImage, readFileAsDataURL } from './utils.js';
import {lerp} from "./math";

export const defaultColormapName = 'peter_kovesi_rainbow_bgyr_35_85_c72_n256';
export const defaultColormapPath = 'resources/colormaps/peter_kovesi/CET-R2.csv';

class ColorMapManager {

    constructor () {
        this.dictionary = {};
    }

    async configure () {

        try {
            await this.addMap({ name: defaultColormapName, path: 'resources/colormaps/peter_kovesi/CET-R2.csv' });
        } catch (e) {
            console.warn(e.message);
        }

        try {
            await this.addMap({ name: 'bintu_et_al', path: 'resources/colormaps/bintu_et_al/bintu_et_al.png' });
        } catch (e) {
            console.warn(e.message);
        }

        try {
            await this.addMap({ name: 'juicebox_default', path: 'resources/colormaps/juicebox_default/juicebox_default.png' });
        } catch (e) {
            console.warn(e.message);
        }

        this.colorMapCanvas =  await createColormapCanvas(defaultColormapPath, 2048, 32)

    }

    async addMap({name, path}) {

        this.dictionary[ name ] = { path, rgb: undefined };

        let response;

        try {
            response = await fetch(path);
        } catch (error) {
            console.warn(error.message);
            return;
        }

        if (200 !== response.status) {
            console.log('ERROR: bad response status');
        }

        const suffix = path.split('.').pop();

        if ('csv' === suffix) {

            try {
                const string = await response.text();
                this.dictionary[ name ] = rgbListWithString(string);
            } catch (e) {
                console.warn(e.message);
            }

        } else if ('png' === suffix) {

            let blob = undefined;
            try {
                blob = await response.blob();
            } catch (e) {
                console.warn(e.message);
            }

            let imageSource = undefined;
            try {
                imageSource = await readFileAsDataURL(blob);
            } catch (e) {
                console.warn(e.message);
            }

            let image = undefined;
            try {
                image = await createImage(imageSource);
            } catch (e) {
                console.warn(e.message);
            }

            this.dictionary[ name ] = rgbListWithImage(image);

        }

    }

    retrieveRGB255String(colorMapName, interpolant) {
        return retrieveRGB(this.dictionary[colorMapName], interpolant, 'rgb255String');
    }

    retrieveRGBThreeJS(colorMapName, interpolant) {
        return retrieveRGB(this.dictionary[colorMapName], interpolant, 'threejs');
    }

}

async function createColormapCanvas(path, width, height) {

    let response

    try {
        response = await fetch(path)
    } catch (error) {
        console.error(error.message)
        return undefined
    }

    if (200 !== response.status) {
        console.error('ERROR: bad response status')
        return undefined
    }

    const suffix = path.split('.').pop()

    if ('csv' === suffix) {

        let string = undefined
        try {
            string = await response.text()
        } catch (e) {
            console.error(e.message)
            return undefined
        }

        const fillStyles = rgbListWithString(string).map(({ rgb255String }) => {
            return rgb255String
        })

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        // ctx.canvas.width = fillStyles.length
        // ctx.canvas.height = 32
        ctx.canvas.width = width
        ctx.canvas.height = height

        ctx.fillStyle = rgb255String(appleCrayonColorRGB255('snow'))
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

        for (let i = 0; i < width; i++) {
            const x = Math.floor(lerp(0, fillStyles.length - 1, i/(width - 1)))
            ctx.fillStyle = fillStyles[ x ]
            ctx.fillRect(i, 0, 1, ctx.canvas.height)
        }

        // let x = 0
        // for (let str of fillStyles) {
        //     // ctx.fillStyle = str
        //     ctx.fillStyle = x < 5 ? rgb255String(appleCrayonColorRGB255('maraschino')) : str
        //     ctx.fillRect(x, 0, 1, ctx.canvas.height)
        //     ++x
        // }

        return canvas
    } else {
        console.error(`ERROR: unsupported file type with suffix ${ suffix }`)
        return undefined
    }

}

function retrieveRGB(rgbList, interpolant, key) {
    const index = Math.floor(interpolant * (rgbList.length - 1));
    return rgbList[ index ][ key ];
}

function rgbListWithImage(image) {

    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');

    ctx.canvas.width = image.width;
    ctx.canvas.height = 1;

    ctx.drawImage(image, 0, 0, ctx.canvas.width, ctx.canvas.height);

    const imageDataAsRGBAList = ctx.getImageData(0,0, ctx.canvas.width, ctx.canvas.height).data;

    let rgbList = [];

    for (let i = 0; i < imageDataAsRGBAList.length; i += 4) {

        // grab r g b channels. ignore alpha channel.
        const [ r, g, b ] = [ imageDataAsRGBAList[ i ], imageDataAsRGBAList[ i+1 ], imageDataAsRGBAList[ i+2 ] ];

        rgbList.push( { rgb255String: rgb255String({ r, g, b }), threejs: rgb255ToThreeJSColor(r, g, b) } );
    }

    return rgbList;

}

function rgbListWithString(string) {

    const lines = string.split(/\r?\n/);

    if (isKennethMorland(name)) {
        lines.shift(); // discard preamble
    }

    return lines
        .filter((line) => {
            return "" !== line
        })
        .map((line) => {

            // scalar | red | green | blue
            let parts = line.split(',');

            if (isKennethMorland(name)) {
                parts.shift(); // discard scalar
            }

            let [ r, g, b ] = parts.map((f) => { return parseInt(f, 10)} );

            return {
                rgb255String: rgb255String({ r, g, b }),
                threejs: rgb255ToThreeJSColor(r, g, b)
            }

        });

}

function isKennethMorland(name) {
    return name.indexOf('kenneth_moreland') > 0
}

function isPeterKovesi(name) {
    return name.indexOf('peter_kovesi') > 0
}

export { createColormapCanvas }

export default ColorMapManager
