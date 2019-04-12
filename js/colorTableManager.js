
import { rgb255String, rgb255ToThreeJSColor } from "./color.js";

class ColorTableManager {

    constructor () {
        this.dictionary = {};
    }

    async addTable ({ name, path }) {

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

        // discard preamble
        lines.shift();

        // scalar | red | green | blue
        obj.rgb = lines
            .filter((line) => { return "" !== line})
            .map((line) => {

                let parts = line.split(',');

                // discard scalar
                parts.shift();

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

export default ColorTableManager;
