class LiveContactMapDataSet {

    constructor(binSize, genome, contactRecordList, averageCount) {

        this.binSize = binSize

        this.bpResolutions = [ binSize ]

        this.genome = genome

        this.averageCount = averageCount

        this.contactRecordList = contactRecordList

        this.wholeGenomeChromosome = genome.getChromosomeAtIndex(0)

        this.normalizationTypes = ['NONE']

        this.isLiveContactMapDataSet = true
    }

    getZoomDataByIndex(chr1, chr2, zoomIndex) {

        const zoomData =
            {
                averageCount: this.averageCount,
                chr1: this.genome.getChromosomeAtIndex(chr1),
                chr2: this.genome.getChromosomeAtIndex(chr2),
                zoom: { index: 0, unit: 'BP', binSize: this.binSize }
            }

        return zoomData

    }

    async getContactRecordsWithRegions() {
        return Promise.resolve(this.contactRecordList)
    }

    async getContactRecords() {
        return Promise.resolve(this.contactRecordList)
    }

    isWholeGenome(ignore) {
        return false
    }
}

export default LiveContactMapDataSet
