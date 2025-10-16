
import { rgb255ToThreeJSColor } from "./colorUtils.js";
import { createImage, readFileAsDataURL } from './utils.js';

import peter_kovesi from '/src/resources/colormaps/peter_kovesi/peter_kovesi.json'
import bintu_et_al from '/resources/colormaps/bintu_et_al/bintu_et_al.png'
import juicebox_default from '/resources/colormaps/juicebox_default/juicebox_default.png'

const defaultColormapName = 'peter_kovesi_rainbow_bgyr_35_85_c72_n256';

class ColorMapManager {

    constructor () {
        this.dictionary = {}
    }

    async configure () {

        try {
            await this.addMap({ name: defaultColormapName, path: peter_kovesi.colors });
        } catch (e) {
            console.warn(e.message);
        }

        try {
            await this.addMap({ name: 'bintu_et_al', path: bintu_et_al });
        } catch (e) {
            console.warn(e.message);
        }

        try {
            await this.addMap({ name: 'juicebox_default', path: juicebox_default });
        } catch (e) {
            console.warn(e.message);
        }

    }

    async addMap({name, path}) {

        if (Array.isArray(path)) {
            this.dictionary[ name ] = path.map(([ r, g, b ]) => rgb255ToThreeJSColor(r, g, b))
        } else {
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

            const last = path.split('.').pop()
            const [ suffix, discard ] = last.split('?')

            if ('png' === suffix) {

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

            } else {
                console.error('Bogus color map format');
            }

        }


    }

    retrieveRGBThreeJS(colorMapName, interpolant) {
        return retrieveRGB(this.dictionary[colorMapName], interpolant);
    }

}

function retrieveRGB(rgbList, interpolant) {

    const a =  Math.floor(interpolant * (rgbList.length - 1))
    const colorA = rgbList[ a ]

    const b =  Math.ceil(interpolant * (rgbList.length - 1))
    const colorB = rgbList[ b ]

    return colorA.clone().lerp(colorB, interpolant)

    // const index = Math.floor(interpolant * (rgbList.length - 1));
    // return rgbList[ index ][ key ]
}

function rgbListWithImage(image) {

    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');

    ctx.canvas.width = image.width;
    ctx.canvas.height = 1;

    ctx.drawImage(image, 0, 0, ctx.canvas.width, ctx.canvas.height);

    const imageDataAsRGBAList = ctx.getImageData(0,0, ctx.canvas.width, ctx.canvas.height).data;

    const rgbList = []

    for (let i = 0; i < imageDataAsRGBAList.length; i += 4) {
        // grab r g b channels. ignore alpha channel.
        const [ r, g, b ] = [ imageDataAsRGBAList[ i ], imageDataAsRGBAList[ i+1 ], imageDataAsRGBAList[ i+2 ] ];
        rgbList.push( rgb255ToThreeJSColor(r, g, b) );
    }

    return rgbList;

}

export { defaultColormapName }

export default ColorMapManager;
