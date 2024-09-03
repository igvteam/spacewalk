class LiveContactMapDataSet {

    constructor(binSize, genome, contactRecordList, averageCount) {

        this.binSize = binSize

        this.bpResolutions = [ binSize ]

        this.genome = genome

        this.chromosomes = genome.chromosomes

        this.averageCount = averageCount

        this.contactRecordList = contactRecordList

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
        const hash = Object.fromEntries(genomeChromosomeMap)
        this._chromosomes = Object.values(hash).map(({ index, bpLength, size, name }) => { return { index, name, size, bpLength }})

        // reorganize array to be consistent with Juicebox layout
        const all = this._chromosomes.pop()
        this._chromosomes.unshift(all)

    }

    get chromosomes() {
        return this._chromosomes.slice()
    }

    isWholeGenome(ignore) {
        return false
    }
}

export default LiveContactMapDataSet
