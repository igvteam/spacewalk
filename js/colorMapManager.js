
import { rgb255String, rgb255ToThreeJSColor } from "./color.js";

class ColorMapManager {

    constructor () {
        this.dictionary = {};
    }

    async addMap({name, path}) {

        this.dictionary[ name ] = { path, rgb: undefined };
        let obj = this.dictionary[ name ];

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

        const string = await response.text();
        const lines = string.split(/\r?\n/);

        if (isKennethMorland(name)) {
            lines.shift(); // discard preamble
        }

        obj.rgb = lines
            .filter((line) => { return "" !== line})
            .map((line) => {

                // scalar | red | green | blue
                let parts = line.split(',');

                if (isKennethMorland(name)) {
                    parts.shift(); // discard scalar
                }

                let [ r, g, b ] = parts.map((f) => { return parseInt(f, 10)} );
                return { rgb255String: rgb255String({ r, g, b }), threejs: rgb255ToThreeJSColor(r, g, b) }

            });

    }

    retrieveRGB255String(name, interpolant) {
        const rgb = this.dictionary[ name ].rgb;
        const index = Math.floor(interpolant * (rgb.length - 1));
        return rgb[ index ].rgb255String;
    }

    retrieveThreeJS(name, interpolant) {
        const rgb = this.dictionary[ name ].rgb;
        const index = Math.floor(interpolant * (rgb.length - 1));
        return rgb[ index ].threejs;
    }

}

let isKennethMorland = (name) => {
    return name.indexOf('kenneth_moreland') > 0;
};

let isPeterKovesi = (name) => {
    return name.indexOf('peter_kovesi') > 0;
};

export default ColorMapManager;
