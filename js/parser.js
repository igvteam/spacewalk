import Globals from "./globals.js";
import igv from '../vendor/igv.esm.js';
import { numberFormatter, readFileAsTextNoPromise } from "./utils.js";
import {contactFrequencyMapPanel, distanceMapPanel, hideSpinner, showSpinner} from "./gui.js";
import { getEnsembleContactFrequencyCanvas} from "./contactFrequencyMapPanel.js";
import {getEnsembleAverageDistanceCanvas} from "./distanceMapPanel.js";

class Parser {
    constructor () {

    }

    parse (string) {

        let raw = string.split('\n');

        // remove comments and empty lines
        let lines = raw.filter(line => {
            return "" !== line;
        });

        // const regex = /[ \t]+/;
        const regex = /\s+/;

        // format directive followed by key-value pairs
        let key_value_pairs = lines.shift().split('##').pop().split(regex);

        // discard furnat=sw1
        key_value_pairs.shift();

        // name
        this.sample = key_value_pairs.shift().split('=').pop();

        // genome
        this.genomeAssembly = key_value_pairs.shift().split('=').pop();


        // discard column headings
        lines.shift();

        // chromosome name
        let chr = undefined;

        let hash = {};
        let hashKey = undefined;
        let trace = undefined;

        let [ genomicStart, genomicEnd ] = [ Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY ];

        console.time('Parser - Parse complete.');

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

                x = 'nan' === x ? undefined : parseFloat(x);
                y = 'nan' === y ? undefined : parseFloat(y);
                z = 'nan' === z ? undefined : parseFloat(z);

                trace[ traceKey ].push ({ startBP, endBP, x, y, z });
            }

        } // for (lines)

        this.locus = { chr, genomicStart, genomicEnd };

        console.timeEnd('Parser - Parse complete.');

        return hash;

    }

    consume (hash) {

        const consumer = isPointCloud(hash) ? Globals.pointCloudManager : Globals.ensembleManager;
        consumer.ingestSW({ locus: this.locus, hash });

        const { chr, genomicStart, genomicEnd } = this.locus;

        if (isPointCloud(hash)) {
            Globals.eventBus.post({ type: "DidLoadPointCloudFile", data: { genomeID: Globals.parser.genomeAssembly, chr, genomicStart, genomicEnd } });
        } else {
            Globals.eventBus.post({ type:           "DidLoadFile", data: { genomeID: Globals.parser.genomeAssembly, chr, genomicStart, genomicEnd, initialKey: '0' } });
        }

    }

    loadURL ({ url, name }) {

        showSpinner();

        (async (url) => {

            let string = undefined;
            try {
                string = await igv.xhr.load(url);
            } catch (e) {
                hideSpinner();
                console.warn(e.message)
            }

            const hash = this.parse(string);
            hideSpinner();

            this.consume(hash);

        })(url);

    }

    loadLocalFile ({ file }) {

        showSpinner();

        const reader = new FileReader();

        reader.onerror = () => {
            hideSpinner();
            reader.abort();
        };

        let txt = undefined;
        reader.onload = e => {
            txt = reader.result;
            window.setTimeout(() => {
                this.parse(txt);
                hideSpinner();
            }, 0);

        };

        reader.readAsText(file);

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

    const [ unused, value ] = Object.entries(hash)[ 0 ];

    const [ irrelevant, candidate ] = Object.entries(value)[ 0 ];

    return (candidate.length > 1);

};

export default Parser;
