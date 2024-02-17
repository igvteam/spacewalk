class DataSourceBase {
    constructor() {

        this.chr = undefined;

        this.genomicStart = Number.POSITIVE_INFINITY;

        this.genomicEnd = Number.NEGATIVE_INFINITY;

        this.isPointCloud = undefined;
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

    getGenomicExtentListWithIndex(index) {
        console.warn(`Warning: Dataset - base class method called getGenomicExtentListWithIndex(${ index })`)
        return undefined
    }

    async getVertexListCount() {
        console.warn('Warning: Dataset - base class method called getTraceCount()')
        return undefined
    }

    getLiveContactFrequencyMapVertexLists(){
        console.warn('Warning: Dataset - base class method called getLiveContactFrequencyMapVertexLists()')
        return []
    }
}

export default DataSourceBase
