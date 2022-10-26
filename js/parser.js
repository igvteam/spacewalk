import { FileUtils, igvxhr } from 'igv-utils'
import { hideGlobalSpinner, showGlobalSpinner } from "./utils.js";
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
                datasets.genomic = new GenomicDataset()
                ds = datasets.genomic
                continue;
            } else if (line.startsWith('nongenomic')) {
                datasets.nongenomic = new NonGenomicDataset()
                ds = datasets.nongenomic
                continue
            }

            if (ds) {
                ds.consume(line, regex)
            }

        }

        datasets.genomic.postprocess()

        if (datasets.nongenomic) {
            datasets.nongenomic.postprocess()
        }

        console.timeEnd(str);

        return datasets

    }

    async loadSessionTrace ({ url, traceKey }) {
        const index = parseInt(traceKey)
        await this.load(url, index)
    }

    async load(path, index) {

        this.url = false === FileUtils.isFilePath(path) ? path : undefined;

        let string = undefined;
        try {
            showGlobalSpinner();
            string = await igvxhr.loadString(path);
            hideGlobalSpinner();
        } catch (e) {
            hideGlobalSpinner();
            console.error(e.message)
        }

        showGlobalSpinner();
        const datasets = this.parse(string);
        hideGlobalSpinner();

        const { sample, genomeAssembly, genomic } = datasets
        ensembleManager.ingest(sample, genomeAssembly, genomic, index)

    }

    toJSON() {

        if (undefined === this.url) {
            throw new Error(`Unable to save session. Local files not supported.`);
        } else {
            return { url: this.url };
        }

    }

    static getTraceSegmentGenomicRange(key) {
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
