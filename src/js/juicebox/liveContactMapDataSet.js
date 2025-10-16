import ContactRecord from "./contactRecord.js"

class LiveContactMapDataSet {

    constructor(genome, ensembleManager) {

        this.genome = genome
        this.chromosomes = genome.chromosomes

        const { genomicStart, genomicEnd } = ensembleManager.locus
        this.binSize = (genomicEnd - genomicStart) / ensembleManager.getLiveMapTraceLength()

        this.bpResolutions = [ this.binSize ]

        this.normalizationTypes = ['NONE']

        this.isLiveContactMapDataSet = true

    }

    getZoomDataByIndex(chr1, chr2, zoomIndex) {

        const chr1Object = this.genome.getChromosome(this.genome.wgChromosomeNames[ chr1 ])
        const chr2Object = this.genome.getChromosome(this.genome.wgChromosomeNames[ chr2 ])

        return {
                averageCount: this.averageCount,
                chr1: chr1Object,
                chr2: chr2Object,
                zoom: { index: 0, unit: 'BP', binSize: this.binSize }
            }

    }

    set chromosomes(genomeChromosomeMap) {
        // Convert genome chromosomes Map to array
        this._chromosomes = Array.from(genomeChromosomeMap.values())

        // Juicebox requires "All" chromosome to be first in the array
        // IGV genome has it last, so we move it to the front
        const allChromosome = this._chromosomes.pop()
        this._chromosomes.unshift(allChromosome)
    }

    get chromosomes() {
        return this._chromosomes.slice()
    }

    isWholeGenome(ignore) {
        return false
    }

    createContactRecordList(state, contacts, traceLength) {

        this.contactRecordList = []
        this.averageCount = 0

        // traverse the upper-triangle of a contact matrix. Each step is one "bin" unit
        let n = 1
        for (let wye = 0; wye < traceLength; wye++) {

            for (let exe = wye; exe < traceLength; exe++) {

                const xy = exe * traceLength + wye
                const count = contacts[ xy ]

                this.contactRecordList.push(new ContactRecord(state.x + exe, state.y + wye, count))

                // Incremental averaging: avg_k = avg_k-1 + (value_k - avg_k-1) / k
                // see: https://math.stackexchange.com/questions/106700/incremental-averageing
                this.averageCount = this.averageCount + (count - this.averageCount)/n

                ++n

            } // for (exe)

        } // for (wye)

    }
}

export default LiveContactMapDataSet
