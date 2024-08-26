class DataSourceBase {
    constructor() {

        this.chr = undefined;

        this.genomicStart = Number.POSITIVE_INFINITY

        this.genomicEnd = Number.NEGATIVE_INFINITY

        this.isPointCloud = undefined

        this.currentGenomicExtentList = undefined
    }

    consumeLines(lines, regex) {
        console.warn('Warning: Dataset - base class method called consumeLines()')
    }

    consumeLine(line, regex) {
        console.warn('Warning: Dataset - base class method called consumeLine()')
    }

    postprocess() {
        console.warn('Warning: Dataset - base class method called postprocess()')
    }

    async createTrace(i){
        console.warn('Warning: Dataset - base class method called createTrace()')
        return []
    }

    getGenomicExtentWithIndex(index) {
        const genomicExtentList = this.currentGenomicExtentList
        return { genomicStart: genomicExtentList[ 0 ].startBP, genomicEnd: genomicExtentList[ genomicExtentList.length - 1 ].endBP }
    }

    async getVertexListCount() {
        console.warn('Warning: Dataset - base class method called getTraceCount()')
        return undefined
    }

    getLiveMapVertexLists(){
        console.warn('Warning: Dataset - base class method called getLiveContactFrequencyMapVertexLists()')
        return []
    }
}

export default DataSourceBase
