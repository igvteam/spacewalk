import {Alert} from 'igv-ui'
import {BGZip, igvxhr, StringUtils} from "igv-utils"
import {loadFasta} from "./fasta.js"
import Cytoband from "./cytoband.js"
import {buildOptions, isDataURL} from "../igv/util/igvUtils.js"
import version from "../igv/version.js"
import Genome from "./genome.js"

const DEFAULT_GENOMES_URL = 'https://igv.org/genomes/genomes.json'
const BACKUP_GENOMES_URL = 'https://s3.amazonaws.com/igv.org.genomes/genomes.json'

const GenomeUtils = {

    KNOWN_GENOMES: undefined,
    currentGenome: undefined,

    loadGenome: async function (options) {

        const sequence = await loadFasta(options)

        let cytobands
        if (options.cytobandURL) {
            cytobands = await loadCytobands(options.cytobandURL, sequence.config)
        } else {
            return undefined
        }

        let aliases
        if (options.aliasURL) {
            aliases = await loadAliases(options.aliasURL, sequence.config)
        }

        return new Genome(options, sequence, cytobands, aliases)

    },

    initializeGenomes: async () => {

        if (undefined === GenomeUtils.KNOWN_GENOMES) {

            try {
                const url = DEFAULT_GENOMES_URL + `?randomSeed=${Math.random().toString(36)}&version=${version()}`  // prevent caching
                const jsonArray = await igvxhr.loadJson(url, {timeout: 5000})
                GenomeUtils.KNOWN_GENOMES = processJson(jsonArray)
            } catch (e) {
                console.error(e)
                try {
                    const url = BACKUP_GENOMES_URL + `?randomSeed=${Math.random().toString(36)}&version=${version()}`  // prevent caching
                    const jsonArray = await igvxhr.loadJson(url, {})
                    GenomeUtils.KNOWN_GENOMES = processJson(jsonArray)
                } catch (e) {
                    console.error(e)
                    console.warn("Errors loading default genome definitions.")
                }
            }

            GenomeUtils.GenomeLibrary = {}

        }
    },

    getGenome: async genomeID => {

        let genome = undefined

        if (undefined === GenomeUtils.GenomeLibrary[ genomeID ]) {
            const genomeConfiguration = GenomeUtils.KNOWN_GENOMES[ genomeID ]
            genome = await GenomeUtils.loadGenome(genomeConfiguration)
        }

        if (undefined === genome) {
            console.error(`Genome ${ genomeID } is invalid`)
        }

        GenomeUtils.GenomeLibrary[ genomeID ] = GenomeUtils.currentGenome = genome

        return GenomeUtils.currentGenome
    },

    isWholeGenomeView: function (chr) {
        return 'all' === chr.toLowerCase()
    },

    // Expand a genome id to a reference object, if needed
    expandReference: function (idOrConfig) {

        // idOrConfig might be json
        if (StringUtils.isString(idOrConfig) && idOrConfig.startsWith("{")) {
            try {
                idOrConfig = JSON.parse(idOrConfig)
            } catch (e) {
                // Apparently its not json,  could be an ID starting with "{".  Unusual but legal.
            }
        }

        let genomeID
        if (StringUtils.isString(idOrConfig)) {
            genomeID = idOrConfig
        } else if (idOrConfig.genome) {
            genomeID = idOrConfig.genome
        } else if (idOrConfig.id !== undefined && idOrConfig.fastaURL === undefined) {
            // Backward compatibility
            genomeID = idOrConfig.id
        }

        if (genomeID) {
            const knownGenomes = GenomeUtils.KNOWN_GENOMES
            const reference = knownGenomes[genomeID]
            if (!reference) {
                Alert.presentAlert(new Error(`Unknown genome id: ${genomeID}`), undefined)
            }
            return reference
        } else {
            return idOrConfig
        }
    }
}

function processJson(jsonArray) {

    const table = {}
    for (const json of jsonArray) {
        table[ json.id ] = json
    }

    return table
}

async function loadCytobands(cytobandUrl, config) {

    let data
    if (isDataURL(cytobandUrl)) {
        const plain = BGZip.decodeDataURI(cytobandUrl)
        data = ""
        const len = plain.length
        for (let i = 0; i < len; i++) {
            data += String.fromCharCode(plain[i])
        }
    } else {
        data = await igvxhr.loadString(cytobandUrl, buildOptions(config))
    }

    // var bands = [],
    //     lastChr,
    //     n = 0,
    //     c = 1,
    //
    //     len = lines.length,
    const cytobands = {}
    let lastChr
    let bands = []
    const lines = StringUtils.splitLines(data)
    for (let line of lines) {
        var tokens = line.split("\t")
        var chr = tokens[0]
        if (!lastChr) lastChr = chr

        if (chr !== lastChr) {
            cytobands[lastChr] = bands
            bands = []
            lastChr = chr
        }

        if (tokens.length === 5) {
            //10	0	3000000	p15.3	gneg
            var start = parseInt(tokens[1])
            var end = parseInt(tokens[2])
            var name = tokens[3]
            var stain = tokens[4]
            bands.push(new Cytoband(start, end, name, stain))
        }
    }

    return cytobands
}

function loadAliases(aliasURL, config) {

    return igvxhr.loadString(aliasURL, buildOptions(config))

        .then(function (data) {

            var lines = StringUtils.splitLines(data),
                aliases = []

            lines.forEach(function (line) {
                if (!line.startsWith("#") && line.length > 0) aliases.push(line.split("\t"))
            })

            return aliases
        })

}

export { GenomeUtils }
