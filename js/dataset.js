class Dataset {
    constructor() {

        this.chr = undefined;
        this.genomicStart = Number.POSITIVE_INFINITY;
        this.genomicEnd = Number.NEGATIVE_INFINITY;

        this.isPointCloud = undefined;

        this.traceLength = undefined

        this.genomicExtentList = undefined
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

    createTrace(i){
        console.warn('Warning: Dataset - base class method called createTrace()')
    }

    getTraceLength(){
        console.warn('Warning: Dataset - base class method called getTraceLength()')
    }

    getLiveContactFrequencyMapVertexLists(){
        console.warn('Warning: Dataset - base class method called getLiveContactFrequencyMapVertexLists()')
    }
}

export default Dataset;
