class LiveContactMapDataSet {

    constructor(binSize, chromosomes, contactRecordList, averageCount) {

        this.binSize = binSize
        this.chromosomes = chromosomes

        this.averageCount = averageCount

        this.contactRecordList = contactRecordList
    }

    initializeContactRecords(contacts) {

    }

    getZoomDataByIndex(chr1, chr2, zoomIndex) {

        const zoomData =
            {
                averageCount: this.averageCount,
                chr1: this.chromosomes[ chr1 ],
                chr2: this.chromosomes[ chr2 ],
                zoom: { index: 0, unit: 'BP', binSize: this.binSize }
            }

        return zoomData

    }
}

export default LiveContactMapDataSet
