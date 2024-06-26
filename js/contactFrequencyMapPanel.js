import hic from 'juicebox.js'
import EnsembleManager from './ensembleManager.js'
import {colorMapManager, ensembleManager, igvPanel, juiceboxPanel} from "./app.js"
import { clamp } from "./math.js";
import Panel from "./panel.js";
import {appleCrayonColorThreeJS, threeJSColorToRGB255} from "./color.js"
import {hideGlobalSpinner, renderArrayToCanvas, showGlobalSpinner} from "./utils.js"
import SpacewalkEventBus from './spacewalkEventBus.js'
import ContactRecord from './contactRecord.js'
import LiveContactMapDataSet from "./liveContactMapDataSet.js"

let ensembleContactFrequencyArray = undefined

let traceContactFrequencyArray = undefined

const maxDistanceThreshold = 1e4
const defaultDistanceThreshold = 256

const kContactFrequencyUndefined = -1

class ContactFrequencyMapPanel extends Panel {

    constructor ({ container, panel, isHidden, distanceThreshold }) {

        const xFunction = (cw, w) => w * 0.1
        const yFunction = (ch, h) => ch - (h * 1.1)
        super({ container, panel, isHidden, xFunction, yFunction })

        const canvasContainer = panel.querySelector('#spacewalk_contact_frequency_map_panel_container')
        const { width, height } = canvasContainer.getBoundingClientRect()

        let canvas

        // ensemble canvas and context
        canvas = canvasContainer.querySelector('#spacewalk_contact_frequency_map_canvas_ensemble')
        canvas.width = width
        canvas.height = height
        this.ctx_ensemble = canvas.getContext('bitmaprenderer')

        // trace canvas and context
        canvas = canvasContainer.querySelector('#spacewalk_contact_frequency_map_canvas_trace')
        canvas.width = width
        canvas.height = height
        this.ctx_trace = canvas.getContext('bitmaprenderer')

        this.input = document.querySelector('#spacewalk_contact_frequency_map_adjustment_select_input')
        this.input.value = distanceThreshold.toString()

        this.distanceThreshold = distanceThreshold;

        SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this);

    }

    initialize(panel) {

        document.querySelector('#spacewalk_contact_frequency_map__button').addEventListener('click', () => {

            this.distanceThreshold = clamp(parseInt(this.input.value, 10), 0, maxDistanceThreshold)

            window.setTimeout(() => {
                this.calculateContactFrequencies()
            }, 0)
        })

        this.worker = new Worker(new URL('./contactFrequencyMapWorker.js', import.meta.url), { type: 'module' })

        this.worker.addEventListener('message', async ({ data }) => {

            console.log(`Contact Frequency ${ data.traceOrEnsemble } map received from worker`)


            allocateContactFrequencyArray(ensembleManager.getLiveMapTraceLength())

            if ('ensemble' === data.traceOrEnsemble) {

                updateContactFrequencyArrayWithFrequencies(data.workerValuesBuffer, ensembleContactFrequencyArray)
                await renderArrayToCanvas(this.ctx_ensemble, ensembleContactFrequencyArray)

                const { chr, genomicStart, genomicEnd } = ensembleManager.locus
                const { hicState, liveContactMapDataSet } = createLiveContactMapDataSet(juiceboxPanel.browser.contactMatrixView.getViewDimensions(), data.workerValuesBuffer, ensembleManager.getLiveMapTraceLength(), ensembleManager.genomeAssembly, chr, genomicStart, genomicEnd)

                await juiceboxPanel.browser.contactMatrixView.renderWithLiveContactFrequencyData(juiceboxPanel.browser, hicState, liveContactMapDataSet, data, ensembleContactFrequencyArray, ensembleManager.getLiveMapTraceLength())

                document.querySelector('#spacewalk-contact-frequency-map-spinner').style.display = 'none'
                hideGlobalSpinner()

            } else {
                updateContactFrequencyArrayWithFrequencies(data.workerValuesBuffer, traceContactFrequencyArray)
                await renderArrayToCanvas(this.ctx_trace, traceContactFrequencyArray)

                document.querySelector('#spacewalk-contact-frequency-map-spinner').style.display = 'none'
                hideGlobalSpinner()

            }


        }, false)

    }

    receiveEvent({ type, data }) {

        if ("DidLoadEnsembleFile" === type) {
            ensembleContactFrequencyArray = traceContactFrequencyArray = undefined
            this.ctx_trace.transferFromImageBitmap(null)
            this.ctx_ensemble.transferFromImageBitmap(null)
        }

        super.receiveEvent({ type, data });

    }

    setState(distanceThreshold) {
        this.distanceThreshold = distanceThreshold
        this.input.value = distanceThreshold.toString()
    }

    present() {
        super.present()
    }

    getClassName(){ return 'ContactFrequencyMapPanel' }

    calculateContactFrequencies() {
        this.updateEnsembleContactFrequencyCanvas()
        this.updateTraceContactFrequencyCanvas()
    }

    updateTraceContactFrequencyCanvas() {

        showGlobalSpinner()
        document.querySelector('#spacewalk-contact-frequency-map-spinner').style.display = 'block'

        const vertices = ensembleManager.getLiveMapTraceVertices(ensembleManager.currentTrace)

        this.distanceThreshold = distanceThresholdEstimate(ensembleManager.currentTrace)
        this.input.value = this.distanceThreshold.toString()

        const data =
            {
                traceOrEnsemble: 'trace',
                traceLength: ensembleManager.getLiveMapTraceLength(),
                verticesString: JSON.stringify(vertices),
                distanceThreshold: this.distanceThreshold
            }

        console.log(`Contact Frequency ${ data.traceOrEnsemble } payload sent to worker`)

        this.worker.postMessage(data)

    }

    updateEnsembleContactFrequencyCanvas() {

        showGlobalSpinner()
        document.querySelector('#spacewalk-contact-frequency-map-spinner').style.display = 'block'

        this.distanceThreshold = distanceThresholdEstimate(ensembleManager.currentTrace)
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

    }
}

function distanceThresholdEstimate(trace) {
    const { radius } = EnsembleManager.getTraceBounds(trace)
    return Math.floor(2 * radius / 4)
}

// Contact Matrix is m by m where m = traceLength
function createLiveContactMapDataSet(contactMatrixViewDimensions, contacts, traceLength, genomeAssembly, chr, genomicStart, genomicEnd) {

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
    const genome = igvPanel.browser.genome

    const liveContactMapDataSet = new LiveContactMapDataSet(binSize, genome, contactRecordList, averageCount)

    return { hicState, liveContactMapDataSet }

}

function createHICState(contactMatrixViewDimensions, traceLength, genomeAssembly, chr, genomicStart, genomicEnd) {

    const chromosome = igvPanel.browser.genome.getChromosome(chr.toLowerCase())

    // chromosome length and index into chromosome array
    const { bpLength, order } = chromosome

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

    return new hic.State(order, order, 0, xBin, yBin, width, height, pixelSize, 'NONE')

}

function allocateContactFrequencyArray(traceLength) {

    if (undefined === ensembleContactFrequencyArray) {
        ensembleContactFrequencyArray = new Uint8ClampedArray(traceLength * traceLength * 4)
    }

    if (undefined === traceContactFrequencyArray) {
        traceContactFrequencyArray = new Uint8ClampedArray(traceLength * traceLength * 4)
    }

}

function updateContactFrequencyArrayWithFrequencies(frequencies, array) {

    const maxFrequency = frequencies.reduce((max, current) => Math.max(max, current), Number.NEGATIVE_INFINITY )

    const colorMap = colorMapManager.dictionary['juicebox_default']

    let i = 0
    for (let frequency of frequencies) {

        let rgb
        if (frequency > kContactFrequencyUndefined) {

            let interpolant = frequency / maxFrequency
            interpolant = Math.floor(interpolant * (colorMap.length - 1))

            rgb = threeJSColorToRGB255(colorMap[ interpolant ][ 'threejs' ])
        } else {
            rgb = threeJSColorToRGB255(appleCrayonColorThreeJS('silver'))
        }

        array[i++] = rgb.r
        array[i++] = rgb.g
        array[i++] = rgb.b
        array[i++] = 255
    }

}

export { defaultDistanceThreshold }

export default ContactFrequencyMapPanel
