import { FileUtils, igvxhr } from 'igv-utils'
import { hideGlobalSpinner, showGlobalSpinner } from "./utils.js";
import { SpacewalkGlobals } from "./app.js";

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

        SpacewalkGlobals.url = false === FileUtils.isFilePath(path) ? path : undefined

        return string

    }

    async parse (path, dataset) {

        let str

        str = 'GenomicParset - load() complete'
        console.time(str)
        const string = await this.load(path)
        console.timeEnd(str)

        str = 'GenomicParser - parse() complete'
        console.time(str)

        // split on newline. remove blank lines
        let lines = string.split('\n').filter(line => "" !== line)

        // const regex = /[ \t]+/;
        const regex = /\s+/;

        const { sample, genomeAssembly } = getSampleNameAndGenome(lines, regex)

        // discard line: chromosome	start	end	x	y	z
        lines.shift()

        dataset.consumeLines(lines, regex)

        console.timeEnd(str)

        return { sample, genomeAssembly }

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
