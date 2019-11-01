import hic from '../node_modules/juicebox.js/dist/juicebox.esm.js';
import { readFileAsText } from "./utils.js";
import { hideSpinner, showSpinner } from "./app.js";
import { ensembleManager } from "./app.js";

class Parser {

    constructor () {

    }

    parse (string) {

        let result = {};

        let raw = string.split('\n');

        // remove comments and empty lines
        let lines = raw.filter(line => {
            return "" !== line;
        });

        // const regex = /[ \t]+/;
        const regex = /\s+/;

        // format directive followed by key-value pairs
        let key_value_pairs = lines.shift().split('##').pop().split(regex);

        // discard format=sw1
        key_value_pairs.shift();

        // name
        result.sample = key_value_pairs.shift().split('=').pop();

        // genome
        result.genomeAssembly = key_value_pairs.shift().split('=').pop();

        // discard column headings
        lines.shift();

        // chromosome name
        let chr = undefined;

        let hash = {};
        let hashKey = undefined;
        let trace = undefined;

        let [ genomicStart, genomicEnd ] = [ Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY ];

        const str = 'Parse complete';
        console.time(str);

        for (let line of lines) {

            // trace
            if (line.startsWith('trace')) {
                hashKey = line.split(regex).join('%');
                hash[ hashKey ] = {};
                trace = hash[ hashKey ];
            } else {

                let [ chr_local, startBP, endBP, x, y, z ] = line.split(regex);

                if (undefined === chr) {
                    chr = chr_local
                }

                const traceKey = `${ startBP }%${ endBP }`;

                if (undefined === trace[ traceKey ]) {
                    trace[ traceKey ] = [];
                }

                startBP = parseInt(startBP, 10);
                endBP = parseInt(endBP, 10);

                genomicStart = Math.min(genomicStart, startBP);
                genomicEnd = Math.max(genomicEnd, endBP);

                x = 'nan' === x ? x : parseFloat(x);
                y = 'nan' === y ? y : parseFloat(y);
                z = 'nan' === z ? z : parseFloat(z);

                trace[ traceKey ].push ({ x, y, z });
            }

        } // for (lines)

        // discard line memory
        lines = null;

        result.locus = { chr, genomicStart, genomicEnd };

        console.timeEnd(str);

        result.traces = hash;

        return result;

    }

    async load ({ loader, path, traceKey }) {

        this.url = false === hic.igv.isFilePath(path) ? path : undefined;

        let string = undefined;
        try {
            showSpinner();
            string = await loader( path );
            hideSpinner();
        } catch (e) {
            hideSpinner();
            console.warn(e.message)
        }

        showSpinner();
        const payload = this.parse(string);
        hideSpinner();

        ensembleManager.ingest(payload, traceKey);

    }

    async loadSessionTrace ({ url, traceKey }) {
        await this.load({ loader: hic.igv.xhr.load, path: url, traceKey });
    }

    async loadURL ({ url, name }) {
        await this.load({ loader: hic.igv.xhr.load, path: url, traceKey: undefined });
    }

    async loadLocalFile({ file }) {
        await this.load({ loader: readFileAsText, path: file, traceKey: undefined });
    }

    toJSON() {

        if (undefined === this.url) {
            throw new Error(`Unable to save session. Local files not supported.`);
        } else {
            return { url: this.url };
        }

    }

    static genomicRangeFromHashKey(key) {
        const [ startBP, endBP ] = key.split('%').map(k => parseInt(k));
        const centroidBP = Math.round((startBP + endBP) / 2.0);
        const sizeBP = endBP - startBP;
        return { startBP, centroidBP, endBP, sizeBP };
    }

}

export default Parser;
