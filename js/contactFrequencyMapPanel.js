import EnsembleManager from './ensembleManager.js'
import { colorMapManager, ensembleManager } from "./app.js"
import { clamp } from "./math.js";
import Panel from "./panel.js";
import {appleCrayonColorRGB255, appleCrayonColorThreeJS, threeJSColorToRGB255} from "./color.js"
import {clearCanvasArray, drawWithCanvasArray} from "./utils.js"
import SpacewalkEventBus from './spacewalkEventBus.js'
import ContactRecord from './juicebox/hicStraw/contactRecord.js'
import {Globals} from './juicebox/globals.js'
import State from './juicebox/hicState.js'
import {GenomeUtils} from './genome/genomeUtils.js'
import LiveContactMapDataSet from "./liveContactMapDataSet.js"

let canvasArray = undefined

const maxDistanceThreshold = 4096;
const defaultDistanceThreshold = 256;

const kContactFrequencyUndefined = -1

class ContactFrequencyMapPanel extends Panel {

    constructor ({ container, panel, isHidden, distanceThreshold }) {

        const xFunction = (cw, w) => {
            return w * 0.1;
        };

        const yFunction = (ch, h) => {
            return ch - (h * 1.1);
        };

        super({ container, panel, isHidden, xFunction, yFunction });

        const $canvas_container = this.$panel.find('#spacewalk_contact_frequency_map_panel_container');

        let canvas;

        // ensemble canvas and context
        canvas = $canvas_container.find('#spacewalk_contact_frequency_map_canvas_ensemble').get(0);
        canvas.width = $canvas_container.width();
        canvas.height = $canvas_container.height();
        this.ctx_ensemble = canvas.getContext('bitmaprenderer');

        // trace canvas and context
        canvas = $canvas_container.find('#spacewalk_contact_frequency_map_canvas_trace').get(0);
        canvas.width = $canvas_container.width();
        canvas.height = $canvas_container.height();
        this.ctx_trace = canvas.getContext('bitmaprenderer');

        this.distanceThreshold = distanceThreshold;

        const input = panel.querySelector('#spacewalk_contact_frequency_map_adjustment_select_input')
        input.value = distanceThreshold.toString()

        panel.querySelector('#spacewalk_contact_frequency_map__button').addEventListener('click', () => {

            const value = input.value
            this.distanceThreshold = clamp(parseInt(value, 10), 0, maxDistanceThreshold);

            window.setTimeout(() => {
                this.updateEnsembleContactFrequencyCanvas(ensembleManager.genomic.traceLength, this.ensemble)
                this.updateTraceContactFrequencyCanvas(ensembleManager.genomic.traceLength, this.trace)
                this.doUpdateTrace = this.doUpdateEnsemble = undefined
            }, 0)
        })

        this.doUpdateTrace = this.doUpdateEnsemble = undefined

        this.worker = new Worker(new URL('./contactFrequencyMapWorker.js', import.meta.url), { type: 'module' })

        this.worker.addEventListener('message', async ({ data }) => {

            let result

            document.querySelector('#spacewalk-contact-frequency-map-spinner').style.display = 'none'

            if ('ensemble' === data.traceOrEnsemble) {
                const { traceLength, chr, genomicStart, genomicEnd } = ensembleManager.genomic
                result = ContactFrequencyMapPanel.createLiveContactMapDataSet(data.workerValuesBuffer, traceLength, ensembleManager.genomeAssembly, chr, genomicStart, genomicEnd)
            }

            populateContactFrequencyCanvasArray(data.workerValuesBuffer)

            const context = 'trace' === data.traceOrEnsemble ? this.ctx_trace : this.ctx_ensemble

            await drawWithCanvasArray(context, canvasArray)

            if ('ensemble' === data.traceOrEnsemble) {
                const { hicState, liveContactMapDataSet } = result
                await Globals.currentBrowser.contactMatrixView.repaintWithLiveContactMap(hicState, liveContactMapDataSet)
            }

        }, false)

        SpacewalkEventBus.globalBus.subscribe('DidSelectTrace', this);
        SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this);

    }

    receiveEvent({ type, data }) {

        if ("DidSelectTrace" === type) {

            const { trace } = data
            this.trace = trace
            this.doUpdateTrace = true

            if (false === this.isHidden) {
                this.updateTraceContactFrequencyCanvas(ensembleManager.genomic.traceLength, this.trace)
                this.doUpdateTrace = undefined
            }

        } else if ("DidLoadEnsembleFile" === type) {

            const { ensemble, trace } = data
            this.ensemble = ensemble
            this.trace = trace
            this.doUpdateTrace = this.doUpdateEnsemble = true

            initializeSharedBuffers(ensembleManager.genomic.traceLength)

            if (false === this.isHidden) {
                this.updateEnsembleContactFrequencyCanvas(ensembleManager.genomic.traceLength, this.ensemble)
                this.updateTraceContactFrequencyCanvas(ensembleManager.genomic.traceLength, this.trace)
                this.doUpdateTrace = this.doUpdateEnsemble = undefined
            }

        }

        super.receiveEvent({ type, data });

    }

    present() {

        if (true === this.doUpdateEnsemble) {
            this.updateEnsembleContactFrequencyCanvas(ensembleManager.genomic.traceLength, this.ensemble)
            this.doUpdateEnsemble = undefined
        }

        if (true === this.doUpdateTrace) {
            this.updateTraceContactFrequencyCanvas(ensembleManager.genomic.traceLength, this.trace)
            this.doUpdateTrace = undefined
        }

        super.present()

    }

    getClassName(){ return 'ContactFrequencyMapPanel' }

    updateTraceContactFrequencyCanvas(traceLength, trace) {

        document.querySelector('#spacewalk-contact-frequency-map-spinner').style.display = 'block'

        const vertices = EnsembleManager.getLiveMapVertices(trace)

        const data =
            {
                traceOrEnsemble: 'trace',
                traceLength,
                verticesString: JSON.stringify(vertices),
                distanceThreshold: this.distanceThreshold
            }

        this.worker.postMessage(data)

        clearCanvasArray(canvasArray, ensembleManager.genomic.traceLength)
        drawWithCanvasArray(this.ctx_trace, canvasArray)

    }

    updateEnsembleContactFrequencyCanvas(traceLength, ensemble) {

        document.querySelector('#spacewalk-contact-frequency-map-spinner').style.display = 'block'

        const vertexLists = Object.values(ensemble).map(trace => EnsembleManager.getLiveMapVertices(trace))

        const data =
            {
                traceOrEnsemble: 'ensemble',
                traceLength,
                vertexListsString: JSON.stringify(vertexLists),
                distanceThreshold: this.distanceThreshold
            }

        this.worker.postMessage(data)

        clearCanvasArray(canvasArray, ensembleManager.genomic.traceLength)
        drawWithCanvasArray(this.ctx_ensemble, canvasArray)

    }

    // Contact Matrix is m by m where m = traceLength
    static createLiveContactMapDataSet(contacts, traceLength, genomeAssembly, chr, genomicStart, genomicEnd) {

        const hicState = createHICState(traceLength, genomeAssembly, chr, genomicStart, genomicEnd)

        // create and return upper triangle of contact frequency matrix
        const contactRecordList = []

        let n = 1
        let averageCount = 0

        // traverse the upper-triangle of a contact matrix. Each step is one "bin" unit
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
        const chromosomes = GenomeUtils.GenomeLibrary[ ensembleManager.genomeAssembly ].getChromosome(chr.toLowerCase())

        const liveContactMapDataSet = new LiveContactMapDataSet(binSize, chromosomes, contactRecordList, averageCount)

        return { hicState, liveContactMapDataSet }

    }
}

function createHICState(traceLength, genomeAssembly, chr, genomicStart, genomicEnd) {

    const chromosome = GenomeUtils.GenomeLibrary[ genomeAssembly ].getChromosome(chr.toLowerCase())

    // chromosome length and index into chromosome array
    const { bpLength, order } = chromosome

    // bp-per-bin
    const binSize = (genomicEnd - genomicStart) / traceLength

    // bin count
    const binCount = bpLength/binSize

    // diplay - pixel x pixel
    const { width, height } = Globals.currentBrowser.contactMatrixView.getViewDimensions()

    // pixels-per-bin
    const pixelSize = width/binCount

    // x, y in Bin units
    const [ xBin, yBin] = [ genomicStart / binSize, genomicStart / binSize ]

    return new State(order, order, 0, xBin, yBin, width, height, pixelSize, undefined)

}

function populateContactFrequencyCanvasArray(frequencies) {

    const maxFrequency = Math.max(Number.NEGATIVE_INFINITY, ...frequencies)

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

        canvasArray[i++] = rgb.r
        canvasArray[i++] = rgb.g
        canvasArray[i++] = rgb.b
        canvasArray[i++] = 255
    }

}

function initializeSharedBuffers(traceLength) {
    canvasArray = new Uint8ClampedArray(traceLength * traceLength * 4)
}

function contactFrequencyMapPanelConfigurator({ container, isHidden }) {

    return {
        container,
        panel: $('#spacewalk_contact_frequency_map_panel').get(0),
        isHidden,
        distanceThreshold: defaultDistanceThreshold
    };

}

export { contactFrequencyMapPanelConfigurator }

export default ContactFrequencyMapPanel
