import { FileUtils, igvxhr } from 'igv-utils'
import { hideGlobalSpinner, showGlobalSpinner } from "./utils.js";
import {ensembleManager, parser} from "./app.js";
import GenomicDataset from "./genomicDataset.js";

class GenomicParser {

    constructor () {

    }

    async load(path) {

        let string = undefined
        try {
            showGlobalSpinner()
            string = await igvxhr.loadString(path)
            hideGlobalSpinner()
        } catch (e) {
            hideGlobalSpinner()
            console.error(e.message)
        }

        return string

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

}

function getSampleNameAndGenome(lines, regex) {

    const line = lines.shift();

    const parts = line.split('##').pop().split(regex);

    // discard format=sw1
    parts.shift();

    // capture cellLine (ex: name=IM90)
    const sample = parts.shift().split('=').pop();

    // capture genome (ex: genome=hg19)
    const genomeAssembly = parts.shift().split('=').pop();

    return { sample, genomeAssembly }
}

export default GenomicParser