import EnsembleManager from './ensembleManager.js'
import { colorMapManager, ensembleManager } from "./app.js"
import { clamp } from "./math.js";
import Panel from "./panel.js";
import {appleCrayonColorRGB255, appleCrayonColorThreeJS, threeJSColorToRGB255} from "./color.js"
import {clearCanvasArray, transferContactFrequencyArrayToCanvas} from "./utils.js"
import SpacewalkEventBus from './spacewalkEventBus.js'
import ContactRecord from './juicebox/hicStraw/contactRecord.js'
import {Globals} from './juicebox/globals.js'
import State from './juicebox/hicState.js'
import {GenomeUtils} from './genome/genomeUtils.js'
import LiveContactMapDataSet from "./liveContactMapDataSet.js"

let contactFrequencyArray = undefined

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

        this.distanceThreshold = distanceThreshold;

        this.input = panel.querySelector('#spacewalk_contact_frequency_map_adjustment_select_input')
        this.input.value = distanceThreshold.toString()

        this.doUpdateTrace = this.doUpdateEnsemble = undefined

        SpacewalkEventBus.globalBus.subscribe('DidSelectTrace', this);
        SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this);

    }

    initialize(panel) {

        panel.querySelector('#spacewalk_contact_frequency_map__button').addEventListener('click', () => {

            this.distanceThreshold = clamp(parseInt(this.input.value, 10), 0, maxDistanceThreshold)

            window.setTimeout(() => {

                // this.updateEnsembleContactFrequencyCanvas(ensembleManager.getTraceLength(), ensembleManager.getLiveContactFrequencyMapVertexLists())

                this.updateTraceContactFrequencyCanvas(ensembleManager.getTraceLength(), ensembleManager.currentTrace)

                this.doUpdateTrace = this.doUpdateEnsemble = undefined

            }, 0)
        })

        this.worker = new Worker(new URL('./contactFrequencyMapWorker.js', import.meta.url), { type: 'module' })

        this.worker.addEventListener('message', async ({ data }) => {

            document.querySelector('#spacewalk-contact-frequency-map-spinner').style.display = 'none'

            paintContactFrequencyArrayWithFrequencies(data.workerValuesBuffer)
            const context = 'trace' === data.traceOrEnsemble ? this.ctx_trace : this.ctx_ensemble
            await transferContactFrequencyArrayToCanvas(context, contactFrequencyArray)

            // Only ensemble data is used to create the live contact map in Juicebox
            if ('ensemble' === data.traceOrEnsemble) {
                const { chr, genomicStart, genomicEnd } = ensembleManager.locus
                const { hicState, liveContactMapDataSet } = createLiveContactMapDataSet(data.workerValuesBuffer, ensembleManager.getTraceLength(), ensembleManager.genomeAssembly, chr, genomicStart, genomicEnd)
                await Globals.currentBrowser.contactMatrixView.renderWithLiveContactFrequencyData(hicState, liveContactMapDataSet, data, contactFrequencyArray)
            }

        }, false)


    }

    receiveEvent({ type, data }) {

        if ("DidSelectTrace" === type) {

            this.doUpdateTrace = true

            if (false === this.isHidden) {
                const { trace } = data
                this.updateTraceContactFrequencyCanvas()
                this.doUpdateTrace = undefined
            }

        } else if ("DidLoadEnsembleFile" === type) {

            this.doUpdateTrace = true
            this.doUpdateEnsemble = true
            allocateContactFrequencyArray(ensembleManager.getTraceLength())

            if (false === this.isHidden) {

                if (true === this.doUpdateEnsemble) {
                    this.updateEnsembleContactFrequencyCanvas()
                    this.doUpdateEnsemble = undefined
                }

                if (true === this.doUpdateTrace) {
                    const { trace } = data
                    this.updateTraceContactFrequencyCanvas()
                    this.doUpdateTrace = undefined
                }

            }

        }

        super.receiveEvent({ type, data });

    }

    setState(distanceThreshold) {
        this.distanceThreshold = distanceThreshold
        this.input.value = distanceThreshold.toString()
    }

    present() {

        if (true === this.doUpdateEnsemble) {
            this.updateEnsembleContactFrequencyCanvas()
            this.doUpdateEnsemble = undefined
        }

        if (true === this.doUpdateTrace) {
            this.updateTraceContactFrequencyCanvas()
            this.doUpdateTrace = undefined
        }

        super.present()

    }

    getClassName(){ return 'ContactFrequencyMapPanel' }

    updateTraceContactFrequencyCanvas() {

        document.querySelector('#spacewalk-contact-frequency-map-spinner').style.display = 'block'

        const vertices = EnsembleManager.getEnsembleTraceVertices(ensembleManager.currentTrace)

        const data =
            {
                traceOrEnsemble: 'trace',
                traceLength: ensembleManager.getTraceLength(),
                verticesString: JSON.stringify(vertices),
                distanceThreshold: this.distanceThreshold
            }

        this.worker.postMessage(data)

        // clearCanvasArray(contactFrequencyArray, ensembleManager.getTraceLength())

        transferContactFrequencyArrayToCanvas(this.ctx_trace, contactFrequencyArray)

    }

    updateEnsembleContactFrequencyCanvas() {

        document.querySelector('#spacewalk-contact-frequency-map-spinner').style.display = 'block'

        const data =
            {
                traceOrEnsemble: 'ensemble',
                traceLength: ensembleManager.getTraceLength(),
                vertexListsString: JSON.stringify( ensembleManager.getLiveContactFrequencyMapVertexLists() ),
                distanceThreshold: this.distanceThreshold
            }

        this.worker.postMessage(data)

        // clearCanvasArray(contactFrequencyArray, ensembleManager.getTraceLength())

        transferContactFrequencyArrayToCanvas(this.ctx_ensemble, contactFrequencyArray)

    }
}

// Contact Matrix is m by m where m = traceLength
function createLiveContactMapDataSet(contacts, traceLength, genomeAssembly, chr, genomicStart, genomicEnd) {

    const hicState = createHICState(traceLength, genomeAssembly, chr, genomicStart, genomicEnd)

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
    const genome = GenomeUtils.GenomeLibrary[ ensembleManager.genomeAssembly ]
    const chromosomes = genome.getChromosome(chr.toLowerCase())

    const liveContactMapDataSet = new LiveContactMapDataSet(binSize, genome, contactRecordList, averageCount)

    return { hicState, liveContactMapDataSet }

}

function createHICState(traceLength, genomeAssembly, chr, genomicStart, genomicEnd) {

    const chromosome = GenomeUtils.GenomeLibrary[ genomeAssembly ].getChromosome(chr.toLowerCase())

    // chromosome length and index into chromosome array
    const { bpLength, order } = chromosome

    // bin count
    const binCount = traceLength

    // bp-per-bin. Bin Size is synonymous with resolution
    const binSize = (genomicEnd - genomicStart) / binCount

    // canvas - pixel x pixel
    const { width, height } = Globals.currentBrowser.contactMatrixView.getViewDimensions()

    // pixels-per-bin
    const pixelSize = width/binCount

    // x, y in Bin units
    const [ xBin, yBin] = [ genomicStart / binSize, genomicStart / binSize ]

    const state = new State(order, order, 0, xBin, yBin, width, height, pixelSize, 'NONE')

    const genome = GenomeUtils.GenomeLibrary[ genomeAssembly ]
    console.warn(`createHICState ${ state.description(genome, binSize, width) }`)

    return state

}

function allocateContactFrequencyArray(traceLength) {
    contactFrequencyArray = new Uint8ClampedArray(traceLength * traceLength * 4)
}

function paintContactFrequencyArrayWithFrequencies(frequencies) {

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

        contactFrequencyArray[i++] = rgb.r
        contactFrequencyArray[i++] = rgb.g
        contactFrequencyArray[i++] = rgb.b
        contactFrequencyArray[i++] = 255
    }

}

export { defaultDistanceThreshold, contactFrequencyArray }

export default ContactFrequencyMapPanel
