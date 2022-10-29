class Dataset {
    constructor() {}

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

    getTraceCount(){
        console.warn('Warning: Dataset - base class method called getTraceCount()')
    }

    getLiveContactFrequencyMapVertexLists(){
        console.warn('Warning: Dataset - base class method called getLiveContactFrequencyMapVertexLists()')
    }
}

export default Dataset;
