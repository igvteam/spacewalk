
import { rgba255, rgba255String, rgb255String, rgb255ToThreeJSColor } from "./color.js";

export const defaultColormapName = 'peter_kovesi_rainbow_bgyr_35_85_c72_n256';

class ColorMapManager {

    constructor () {
        this.dictionary = {};
    }

    async configure () {

        let colormaps = {};
        colormaps[ defaultColormapName ] = 'resources/colormaps/peter_kovesi/CET-R2.csv';
        colormaps[ 'bintu_et_al' ] = 'resources/colormaps/bintu_et_al/bintu_et_al.png';

        await this.addMap({ name: defaultColormapName, path: colormaps[ defaultColormapName ] });
        await this.addMap({ name: 'bintu_et_al', path: colormaps[ 'bintu_et_al' ] });

        // for (let key of Object.keys(colormaps)) {
        //     await this.addMap({ name: key, path: colormaps[ key ] });
        // }

    }

    async addMap({name, path}) {

        this.dictionary[ name ] = { path, rgb: undefined };

        let response;

        try {
            response = await fetch(path);
            const guard = 353;
        } catch (error) {
            console.warn(error.message);
            return;
        }

        if (200 !== response.status) {
            console.log('ERROR: bad response status');
        }

        const suffix = path.split('.').pop();

        let obj = this.dictionary[ name ];
        if ('csv' === suffix) {
            const string = await response.text();
            this.handleString(obj, string);
        } else if ('png' === suffix) {
            const arrayBuffer = await response.arrayBuffer();
            this.handleImageData(obj, arrayBuffer);
        }

    }

    handleString(obj, string) {

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

    handleImageData(obj, arrayBuffer) {

        let byteArray = new Uint8Array(arrayBuffer);
        const guard = 373;

        // TODO: Load PNG image directly into canvas.
        // TODO: See https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Using_images
        /*
         var ctx = document.getElementById('canvas').getContext('2d');
        var img = new Image();
        img.onload = function() {
            ctx.drawImage(img, 0, 0);
            ctx.beginPath();
            ctx.moveTo(30, 96);
            ctx.lineTo(70, 66);
            ctx.lineTo(103, 76);
            ctx.lineTo(170, 15);
            ctx.stroke();
        };
        img.src = 'https://mdn.mozillademos.org/files/5395/backdrop.png';

         */
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
