import hic from 'juicebox.js'
import {ensembleManager, igvPanel, juiceboxPanel} from "../app.js"
import EnsembleManager from "../ensembleManager.js"
import LiveContactMapDataSet from "./liveContactMapDataSet.js"
import SpacewalkEventBus from "../spacewalkEventBus.js"
import {hideGlobalSpinner, showGlobalSpinner} from "../utils/utils.js"
import ContactRecord from "../utils/contactRecord.js"
import {clamp} from "../utils/math.js"

const maxDistanceThreshold = 1e4
const defaultDistanceThreshold = 256

class LiveContactMapService {

    constructor (distanceThreshold) {

        this.distanceThreshold = distanceThreshold
        this.hicState = undefined
        this.liveContactMapDataSet = undefined
        this.contactFrequencies = undefined
        this.ensembleContactFrequencyArray = undefined

        this.input = document.querySelector('#spacewalk_contact_frequency_map_adjustment_select_input')
        this.input.value = distanceThreshold.toString()

        document.querySelector('#spacewalk_contact_frequency_map_button').addEventListener('click', () => {

            this.distanceThreshold = clamp(parseInt(this.input.value, 10), 0, maxDistanceThreshold)

            window.setTimeout(() => {
                this.updateEnsembleContactFrequencyCanvas(this.distanceThreshold)
            }, 0)
        })

        this.worker = new Worker(new URL('./liveContactMapWorker.js', import.meta.url), { type: 'module' })

        this.worker.addEventListener('message', async ({ data }) => {

            console.log(`Contact Frequency ${ data.traceOrEnsemble } map received from worker`)

            // this.allocateGlobalContactFrequencyBuffer(ensembleManager.getLiveMapTraceLength())

            if ('ensemble' === data.traceOrEnsemble) {

                const { genomeAssembly } = ensembleManager
                const { chr, genomicStart, genomicEnd } = ensembleManager.locus
                const traceLength = ensembleManager.getLiveMapTraceLength()

                const { hicState, liveContactMapDataSet } = createLiveContactMapDataSet(igvPanel.browser.genome, juiceboxPanel.browser.contactMatrixView.getViewDimensions(), data.workerValuesBuffer, traceLength, genomeAssembly, chr, genomicStart, genomicEnd)

                this.hicState = hicState
                this.liveContactMapDataSet = liveContactMapDataSet
                this.contactFrequencies = data.workerValuesBuffer

                await juiceboxPanel.renderWithLiveContactFrequencyData(this.hicState, this.liveContactMapDataSet, this.contactFrequencies, this.ensembleContactFrequencyArray, ensembleManager.getLiveMapTraceLength())

                hideGlobalSpinner()

            }

        }, false)

        SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this);

    }

    receiveEvent({ type, data }) {

        if ("DidLoadEnsembleFile" === type) {

            this.hicState = undefined
            this.liveContactMapDataSet = undefined
            this.contactFrequencies = undefined
            this.ensembleContactFrequencyArray = undefined

            this.distanceThreshold = distanceThresholdEstimate(ensembleManager.currentTrace)
            this.input.value = this.distanceThreshold.toString()

            this.allocateGlobalContactFrequencyBuffer(ensembleManager.getLiveMapTraceLength())
        }
    }

    setState(distanceThreshold) {
        this.distanceThreshold = distanceThreshold
        this.input.value = distanceThreshold.toString()
    }

    getClassName(){ return 'LiveContactMapService' }

    updateEnsembleContactFrequencyCanvas(distanceThresholdOrUndefined) {

        const { chr } = ensembleManager.locus
        const chromosome = igvPanel.browser.genome.getChromosome(chr.toLowerCase())

        if (chromosome) {
            showGlobalSpinner()

            this.distanceThreshold = distanceThresholdOrUndefined || distanceThresholdEstimate(ensembleManager.currentTrace)
            this.input.value = this.distanceThreshold.toString()

            const data =
                {
                    traceOrEnsemble: 'ensemble',
                    traceLength: ensembleManager.getLiveMapTraceLength(),
                    vertexListsString: JSON.stringify( ensembleManager.getLiveMapVertexLists()),
                    distanceThreshold: this.distanceThreshold
                }

            console.log(`Contact Frequency ${ data.traceOrEnsemble } payload sent to worker`)

            this.worker.postMessage(data)

        } else {
            hideGlobalSpinner()
            const str = `Warning! Can not create Live Contact Map. No valid genome for chromosome ${ chr }`
            console.warn(str)
            alert(str)
        }


    }

    allocateGlobalContactFrequencyBuffer(traceLength) {
        this.ensembleContactFrequencyArray = new Uint8ClampedArray(traceLength * traceLength * 4)
    }

}

function distanceThresholdEstimate(trace) {
    const { radius } = EnsembleManager.getTraceBounds(trace)
    return Math.floor(2 * radius / 4)
}

// Contact Matrix is m by m where m = traceLength
function createLiveContactMapDataSet(genome, contactMatrixViewDimensions, contacts, traceLength, genomeAssembly, chr, genomicStart, genomicEnd) {

    const hicState = createHICState(contactMatrixViewDimensions, traceLength, genomeAssembly, chr, genomicStart, genomicEnd)

    const contactRecordList = []

    // traverse the upper-triangle of a contact matrix. Each step is one "bin" unit
    let n = 1
    let averageCount = 0
    for (let wye = 0; wye < traceLength; wye++) {

        for (let exe = wye; exe < traceLength; exe++) {

            const xy = exe * traceLength + wye
            const count = contacts[ xy ]

            contactRecordList.push(new ContactRecord(hicState.x + exe, hicState.y + wye, count))

            // Incremental averaging: avg_k = avg_k-1 + (value_k - avg_k-1) / k
            // see: https://math.stackexchange.com/questions/106700/incremental-averageing
            averageCount = averageCount + (count - averageCount)/n

            ++n

        } // for (exe)

    } // for (wye)

    const binSize = (genomicEnd - genomicStart) / traceLength

    const liveContactMapDataSet = new LiveContactMapDataSet(binSize, genome, contactRecordList, averageCount)

    return { hicState, liveContactMapDataSet }

}

function createHICState(contactMatrixViewDimensions, traceLength, genomeAssembly, chr, genomicStart, genomicEnd) {

    const chromosome = igvPanel.browser.genome.getChromosome(chr.toLowerCase())


    // bin count
    const binCount = traceLength

    // bp-per-bin. Bin Size is synonymous with resolution
    const binSize = (genomicEnd - genomicStart) / binCount

    // canvas - pixel x pixel
    const { width, height } = contactMatrixViewDimensions

    // pixels-per-bin
    const pixelSize = width/binCount

    // x, y in Bin units
    const [ xBin, yBin] = [ genomicStart / binSize, genomicStart / binSize ]

    // chromosome index
    let { order } = chromosome

    // IGV chromosome indices are off by one relative to Juicebox chromosomes
    return new hic.State(1 + order, 1 + order, 0, xBin, yBin, width, height, pixelSize, 'NONE')

}

export { defaultDistanceThreshold }

export default LiveContactMapService
