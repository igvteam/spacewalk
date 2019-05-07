import * as THREE from "./threejs_es6/three.module.js";
import igv from '../node_modules/igv/dist/igv.esm.js'
import { globalEventBus } from "./eventBus.js";
import { readFileAsText } from "./utils.js";

class StructureManager {

    constructor () {
        this.stepSize = 3e4;
        this.path = undefined;
    }

    ingest(string) {
        this.structures = {};
        const lines = string.split(/\r?\n/);

        // discard blurb
        lines.shift();

        // discard column titles
        lines.shift();

        // chr-index ( 0-based)| segment-index (one-based) | Z | X | y

        let currentKey;
        let list;
        for (let line of lines) {

            if ("" !== line) {

                let parts = line.split(',');

                if ('nan' === parts[ 2 ] || 'nan' === parts[ 3 ] || 'nan' === parts[ 4 ]) {
                    // do nothing
                } else {

                    const key = parseInt(parts[ 0 ], 10) - 1;

                    if (undefined === currentKey || currentKey !== key) {
                        currentKey = key;
                        this.structures[ currentKey ] = [];
                        list = this.structures[ currentKey ];
                    }

                    // discard chr-index
                    parts.shift();

                    // discard segment-index
                    parts.shift();

                    let [ z, x, y ] = parts;
                    let obj = { xyz: [ parseFloat(x), parseFloat(y), parseFloat(z) ] };

                    list.push(obj);
                    obj.segmentIndex = 1 + list.indexOf(obj);
                }

            }

        }

    }

    structureWithName(name) {
        return this.structures[ name ] || undefined;
    }

    parsePathEncodedGenomicLocation(path) {

        let dev_null;
        let parts = path.split('_');
        dev_null = parts.shift();
        let locus = parts[ 0 ];

        let [ chr, start, end ] = locus.split('-');

        dev_null = end.split(''); // 3 0 M b
        dev_null.pop(); // 3 0 M
        dev_null.pop(); // 3 0
        end = dev_null.join(''); // 30

        this.locus = { chr, genomicStart: parseInt(start) * 1e6, genomicEnd: parseInt(end) * 1e6 };
    };

    async loadURL ({ url, name }) {

        try {

            let urlContents = await igv.xhr.load(url);
            const { file } = igv.parseUri(url);

            globalEventBus.post({ type: "DidLoadFile", data: { name: file, payload: urlContents } });

        } catch (error) {
            console.warn(error.message);
        }

    }

    async loadLocalFile ({ file }) {

        try {
            const fileContents = await readFileAsText(file);
            globalEventBus.post({ type: "DidLoadFile", data: { name: file.name, payload: fileContents } });
        } catch (e) {
            console.warn(e.message)
        }

    }
}

export default StructureManager;
