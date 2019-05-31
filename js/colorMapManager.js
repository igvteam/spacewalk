
import { rgba255, rgba255String, rgb255String, rgb255ToThreeJSColor } from "./color.js";
import { createImage, readFileAsDataURL } from './utils.js';

export const defaultColormapName = 'peter_kovesi_rainbow_bgyr_35_85_c72_n256';

class ColorMapManager {

    constructor () {
        this.dictionary = {};
    }

    async configure () {
        await this.addMap({ name: defaultColormapName, path: 'resources/colormaps/peter_kovesi/CET-R2.csv' });
        await this.addMap({ name: 'bintu_et_al',       path: 'resources/colormaps/bintu_et_al/bintu_et_al.png' });
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

            const string = await response.text();
            this.dictionary[ name ] = rgbListWithString(string);

        } else if ('png' === suffix) {

            const blob = await response.blob();
            const imageSource = await readFileAsDataURL(blob);
            const image = await createImage(imageSource);
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

const retrieveRGB = (rgbList, interpolant, key) => {
    const index = Math.floor(interpolant * (rgbList.length - 1));
    return rgbList[ index ][ key ];
};

const rgbListWithImage = image => {

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

};

const rgbListWithString = string => {

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

};

let isKennethMorland = (name) => {
    return name.indexOf('kenneth_moreland') > 0;
};

let isPeterKovesi = (name) => {
    return name.indexOf('peter_kovesi') > 0;
};

export default ColorMapManager;
