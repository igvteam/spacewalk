/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import {StringUtils} from "igv-utils"
import Chromosome from "./chromosome.js"

class Genome {

    constructor(config, sequence, ideograms, aliases) {

        this.config = config

        this.sequence = sequence

        this.id = config.id || generateGenomeID(config)

        this.ideograms = ideograms

        this.featureDB = {}

        // NOTE: In this Genome version chromosomeNames === wgChromosomeNames
        this.constructWholeGenomeNames(config, sequence)

        this.chrAliasTable = {}
        this.chrAliasTable['all'] = 'all'

        for (let name of this.chromosomeNames) {

            const alias = name.startsWith("chr") ? name.substring(3) : "chr" + name

            this.chrAliasTable[alias.toLowerCase()] = name

            if (name === "chrM") this.chrAliasTable["mt"] = "chrM"
            if (name === "MT") this.chrAliasTable["chrm"] = "MT"

            this.chrAliasTable[name.toLowerCase()] = name

        }

        // Custom mappings
        if (aliases) {

            for (let array of aliases) {

                let defName

                for (let item of array) {
                    if (this.chromosomes[item]) {
                        defName = item
                        break
                    }
                }

                if (defName) {
                    array.forEach(alias => {
                        if (alias !== defName) {
                            this.chrAliasTable[ alias.toLowerCase() ] = this.chrAliasTable[ alias ] = defName
                        }
                    })
                }

            }

        }

    }

    constructWholeGenomeNames(config, sequence) {

        let things

        if (config.chromosomeOrder) {

            if (Array.isArray(config.chromosomeOrder)) {
                this.wgChromosomeNames = config.chromosomeOrder
            } else {
                this.wgChromosomeNames = config.chromosomeOrder.split(',').map(nm => nm.trim())
            }

            things = this.wgChromosomeNames.map(nm => sequence.chromosomes[nm]).filter(chr => chr !== undefined)

        } else {

            // Trim small chromosomes.
            const lengths = Object.keys(sequence.chromosomes).map(key => sequence.chromosomes[key].bpLength)

            const median = lengths.reduce((a, b) => Math.max(a, b))
            const threshold = median / 50

            things = Object.values(sequence.chromosomes).filter(chr => chr.bpLength > threshold)

            // Sort chromosomes.  First segregate numeric and alpha names, sort numeric, leave alpha as is

            const isDigit = val => /^\d+$/.test(val)

            const numericChromosomes = things.filter(chr => isDigit(chr.name.replace('chr', '')))
            const alphaChromosomes = things.filter(chr => !isDigit(chr.name.replace('chr', '')))
            numericChromosomes.sort((a, b) => Number.parseInt(a.name.replace('chr', '')) - Number.parseInt(b.name.replace('chr', '')))

            const wgChromosomeNames = numericChromosomes.map(chr => chr.name)
            for (let chr of alphaChromosomes) {
                wgChromosomeNames.push(chr.name)
            }
            this.wgChromosomeNames = wgChromosomeNames
        }

        this.chromosomes = {}

        const bpLength = things.reduce((accumulator, currentValue) => accumulator += currentValue.bpLength, 0)

        this.chromosomes[ 'all' ] = new Chromosome('all', -1, 0, bpLength)
        for (let name of this.wgChromosomeNames) {
            this.chromosomes[ name ] = sequence.chromosomes[ name ]
        }

        this.chromosomeNames = this.wgChromosomeNames.slice()
        this.chromosomeNames.unshift('all')

    }

    showWholeGenomeView() {
        return this.config.wholeGenomeView !== false
    }

    toJSON() {
        return Object.assign({}, this.config, {tracks: undefined})
    }

    getInitialLocus() {

    }

    getHomeChromosomeName() {
        if (this.showWholeGenomeView() && this.chromosomes.hasOwnProperty("all")) {
            return "all"
        } else {
            return this.chromosomeNames[0]

        }
    }

    getChromosomeName(str) {
        const chr = str ? this.chrAliasTable[str.toLowerCase()] : str
        return chr ? chr : str
    }

    getChromosome(chr) {
        chr = this.getChromosomeName(chr)
        return this.chromosomes[chr]
    }

    getCytobands(chr) {
        return this.ideograms ? this.ideograms[chr] : null
    }

    getLongestChromosome() {

        var longestChr,
            chromosomes = this.chromosomes
        for (let key in chromosomes) {
            if (chromosomes.hasOwnProperty(key)) {
                var chr = chromosomes[key]
                if (longestChr === undefined || chr.bpLength > longestChr.bpLength) {
                    longestChr = chr
                }
            }
            return longestChr
        }
    }

    getChromosomes() {
        return this.chromosomes
    }

    /**
     * Return the genome coordinate in kb for the give chromosome and position.
     * NOTE: This might return undefined if the chr is filtered from whole genome view.
     */
    getGenomeCoordinate(chr, bp) {

        var offset = this.getCumulativeOffset(chr)
        if (offset === undefined) return undefined

        return offset + bp
    }

    /**
     * Return the chromosome and coordinate in bp for the given genome coordinate
     */
    getChromosomeCoordinate(genomeCoordinate) {

        if (this.cumulativeOffsets === undefined) {
            this.cumulativeOffsets = computeCumulativeOffsets.call(this)
        }

        let lastChr = undefined
        let lastCoord = 0
        for (let name of this.wgChromosomeNames) {

            const cumulativeOffset = this.cumulativeOffsets[name]
            if (cumulativeOffset > genomeCoordinate) {
                const position = genomeCoordinate - lastCoord
                return {chr: lastChr, position: position}
            }
            lastChr = name
            lastCoord = cumulativeOffset
        }

        // If we get here off the end
        return {chr: this.wgChromosomeNames[this.wgChromosomeNames.length - 1], position: 0}

    };


    /**
     * Return the offset in genome coordinates (kb) of the start of the given chromosome
     * NOTE:  This might return undefined if the chromosome is filtered from whole genome view.
     */
    getCumulativeOffset(chr) {

        if (this.cumulativeOffsets === undefined) {
            this.cumulativeOffsets = computeCumulativeOffsets.call(this)
        }

        const queryChr = this.getChromosomeName(chr)
        return this.cumulativeOffsets[queryChr]

        function computeCumulativeOffsets() {

            let self = this
            let acc = {}
            let offset = 0
            for (let name of self.wgChromosomeNames) {

                acc[name] = Math.floor(offset)

                const chromosome = self.getChromosome(name)

                offset += chromosome.bpLength
            }

            return acc
        }
    }

    /**
     * Return the nominal genome length, this is the length of the main chromosomes (no scaffolds, etc).
     */
    getGenomeLength() {

        let self = this

        if (!this.bpLength) {
            let bpLength = 0
            self.wgChromosomeNames.forEach(function (cname) {
                let c = self.chromosomes[cname]
                bpLength += c.bpLength
            })
            this.bpLength = bpLength
        }
        return this.bpLength
    }

    async getSequence(chr, start, end) {
        chr = this.getChromosomeName(chr)
        return this.sequence.getSequence(chr, start, end)
    }
}

function generateGenomeID(config) {
    if (config.id !== undefined) {
        return config.id
    } else if (config.fastaURL && StringUtils.isString(config.fastaURL)) {
        return config.fastaURL
    } else if (config.fastaURL && config.fastaURL.name) {
        return config.fastaURL.name
    } else {
        return ("0000" + (Math.random() * Math.pow(36, 4) << 0).toString(36)).slice(-4)
    }
}

export default Genome

