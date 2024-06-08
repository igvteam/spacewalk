class LiveContactMapDataSet {

    constructor(binSize, genome, contactRecordList, averageCount) {

        this.binSize = binSize

        this.bpResolutions = [ binSize ]

        this.genome = genome

        this.chromosomes = getDatasetChromosomeList(genome.chromosomes)

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

    isWholeGenome(ignore) {
        return false
    }
}

function getDatasetChromosomeList(genomeChromosomeDictionary) {

    const dataseChromosomeList = Object.values(genomeChromosomeDictionary).map(({ index, bpLength, size, name }) => {
        return { index, name, size, bpLength }
    })

    // 'All' is ununsed
    // dataseChromosomeList.unshift({ index:0 , name:'All', size:0, bpLength:0 })

    return dataseChromosomeList
}

export default LiveContactMapDataSet
