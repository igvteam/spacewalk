import { FileUtils, igvxhr } from 'igv-utils'
import { hideGlobalSpinner, showGlobalSpinner } from "./utils.js";
import { ensembleManager } from "./app.js";
import GenomicDataset from "./genomicDataset.js";

class GenomicParser {

    constructor () {

    }

    parse (string) {

        const str = 'Parse complete';
        console.time(str);

        // split on newline. remove blank lines
        let lines = string.split('\n').filter(line => "" !== line)

        // const regex = /[ \t]+/;
        const regex = /\s+/;

        const { sample, genomeAssembly } = getSampleNameAndGenome(lines, regex)

        // discard line: chromosome	start	end	x	y	z
        lines.shift()

        const dataset = new GenomicDataset()
        dataset.consumeLines(lines, regex)

        console.timeEnd(str)

        return { sample, genomeAssembly, dataset }

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
        const { sample, genomeAssembly, dataset } = this.parse(string)
        hideGlobalSpinner();

        ensembleManager.ingest(sample, genomeAssembly, dataset, index)

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

export default GenomicParser
