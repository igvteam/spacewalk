import hic from '../node_modules/juicebox.js/dist/juicebox.esm.js';
import { hideSpinner, showSpinner } from "./app.js";
import { ensembleManager } from "./app.js";
import GenomicDataset from "./genomicDataset.js";
import NonGenomicDataset from "./nonGenomicDataset.js";

class Parser {

    constructor () {

    }

    parse (string) {

        const str = 'Parse complete';
        console.time(str);

        let raw = string.split('\n');

        // remove comments and empty lines
        let lines = raw.filter(line => "" !== line);

        // const regex = /[ \t]+/;
        const regex = /\s+/;

        const datasets = Object.assign({}, getSampleNameAndGenome(lines, regex));

        let ds = undefined;
        for (let line of lines) {

            if (line.startsWith('chromosome')) {
                datasets[ 'genomic' ] = new GenomicDataset();
                ds = datasets[ 'genomic' ];
                continue;
            } else if (line.startsWith('nongenomic')) {
                datasets[ 'nongenomic' ] = new NonGenomicDataset();
                ds = datasets[ 'nongenomic' ];
                continue;
            }

            if (ds) {
                ds.consume(line, regex);
            }

        }

        datasets[ 'genomic' ].postprocess();
        if (datasets[ 'nongenomic' ]) {
            datasets[ 'nongenomic' ].postprocess();
        }

        console.timeEnd(str);

        return datasets;

    }

    DEPRICATED_parse (string) {

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

    async loadSessionTrace ({ url, traceKey }) {
        await this.load(url, traceKey);
    }

    async load (path, traceKey) {

        this.url = false === hic.igv.isFilePath(path) ? path : undefined;

        let string = undefined;
        try {
            showSpinner();
            string = await hic.igv.xhr.load(path);
            hideSpinner();
        } catch (e) {
            hideSpinner();
            console.error(e.message)
        }

        showSpinner();
        const payload = this.parse(string);
        hideSpinner();

        ensembleManager.ingest(payload, traceKey);

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

const getSampleNameAndGenome = (lines, regex) => {

    const line = lines.shift();

    const parts = line.split('##').pop().split(regex);

    // discard format=sw1
    parts.shift();

    // capture cellLine (ex: name=IM90)
    const sample = parts.shift().split('=').pop();

    // capture genome (ex: genome=hg19)
    const genomeAssembly = parts.shift().split('=').pop();

    return { sample, genomeAssembly }
};


export default Parser;
