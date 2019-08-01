import Globals from "./globals.js";
import igv from '../node_modules/igv/dist/igv.esm.js';
import { numberFormatter, readFileAsText } from "./utils.js";

class Parser {
    constructor () {

    }

    parse (string) {

        let raw = string.split('\n');

        // remove comments and empty lines
        let lines = raw.filter(line => {
            return line.charAt(0) !== '#' && "" !== line;
        });

        // cell line
        this.sample = lines.shift();

        // genome assembly
        this.genomeAssembly = lines.shift();

        // chromosome name
        const [ bed, chr ] = lines.shift().split(' ');

        let hash = {};
        let hashKey = undefined;
        let trace = undefined;

        let [ genomicStart, genomicEnd ] = [ Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY ];

        console.time('Parser - Parse complete.');

        for (let line of lines) {

            // trace
            if (line.startsWith('trace')) {
                hashKey = line.split(' ').join('%');
                hash[ hashKey ] = {};
                trace = hash[ hashKey ];
            } else {

                let [ startBP, endBP, x, y, z ] = line.split(' ');

                const traceKey = `${ startBP }%${ endBP }`;

                if (undefined === trace[ traceKey ]) {
                    trace[ traceKey ] = [];
                }

                startBP = parseInt(startBP, 10);
                endBP = parseInt(endBP, 10);

                genomicStart = Math.min(genomicStart, startBP);
                genomicEnd = Math.max(genomicEnd, endBP);

                x = 'nan' === x ? undefined : parseFloat(x);
                y = 'nan' === y ? undefined : parseFloat(y);
                z = 'nan' === z ? undefined : parseFloat(z);

                trace[ traceKey ].push ({ startBP, endBP, x, y, z });
            }

        } // for (lines)

        console.timeEnd('Parser - Parse complete.');

        const consumer = isPointCloud(hash) ? Globals.pointCloudManager : Globals.ensembleManager;

        const locus = { chr, genomicStart, genomicEnd };

        this.locus = locus;

        consumer.ingestSW({ locus, hash });
    }

    async loadURL ({ url, name }) {

        let string = undefined;
        try {
            string = await igv.xhr.load(url);
        } catch (e) {
            console.warn(e.message)
        }

        this.parse(string);
    }

    async loadLocalFile ({ file }) {

        let string = undefined;
        try {
            string = await readFileAsText(file);
        } catch (e) {
            console.warn(e.message)
        }

        this.parse(string);

    }

    reportFileLoadError(name) {
        return `Parser: Error loading ${ name }`
    }

    locusBlurb() {
        const { chr, genomicStart, genomicEnd } = this.locus;
        return `${ chr } : ${ numberFormatter(genomicStart) } - ${ numberFormatter(genomicEnd) }`;
    }

    sampleBlurb() {
        return `Sample ${ this.sample }`;
    }

}

const isPointCloud = hash => {

    const [ key, value ] = Object.entries(hash)[ 0 ];
    return 1 === Object.keys(value).length;

};

export default Parser;
