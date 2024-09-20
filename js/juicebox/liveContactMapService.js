import {ensembleManager, igvPanel, juiceboxPanel} from "../app.js"
import EnsembleManager from "../ensembleManager.js"
import SpacewalkEventBus from "../spacewalkEventBus.js"
import {hideGlobalSpinner, showGlobalSpinner, transferRGBAMatrixToLiveMapCanvas} from "../utils/utils.js"
import {clamp} from "../utils/mathUtils.js"
import {HICEvent} from "./juiceboxHelpful.js"

const maxDistanceThreshold = 1e4
const defaultDistanceThreshold = 256

class LiveContactMapService {

    constructor (distanceThreshold) {

        this.distanceThreshold = distanceThreshold

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

            if ('ensemble' === data.traceOrEnsemble) {

                this.contactFrequencies = data.workerValuesBuffer
                juiceboxPanel.createContactRecordList(this.contactFrequencies, ensembleManager.getLiveMapTraceLength())

                await juiceboxPanel.renderLiveMapWithContactData(this.contactFrequencies, this.ensembleContactFrequencyArray, ensembleManager.getLiveMapTraceLength())

                hideGlobalSpinner()

            }

        }, false)

        SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this);

    }

    receiveEvent({ type, data }) {

        if ("DidLoadEnsembleFile" === type) {

            this.contactFrequencies = undefined

            const traceLength = ensembleManager.getLiveMapTraceLength()
            this.ensembleContactFrequencyArray = new Uint8ClampedArray(traceLength * traceLength * 4)

            this.distanceThreshold = distanceThresholdEstimate(ensembleManager.currentTrace)
            this.input.value = this.distanceThreshold.toString()

        }
    }

    setState(distanceThreshold) {
        this.distanceThreshold = distanceThreshold
        this.input.value = distanceThreshold.toString()
    }

    getClassName(){
        return 'LiveContactMapService'
    }

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
}

async function renderLiveMapWithContactData(browser, state, liveContactMapDataSet, frequencies, frequencyRGBAList, liveMapTraceLength) {

    browser.eventBus.post(HICEvent('MapLoad', { dataset: liveContactMapDataSet, state }))

    browser.locusGoto.doChangeLocus({ dataset: liveContactMapDataSet, state })

    const zoomIndexA = state.zoom
    const { chr1, chr2 } = state
    const zoomData = liveContactMapDataSet.getZoomDataByIndex(chr1, chr2, zoomIndexA)

    browser.contactMatrixView.checkColorScale_sw(browser, state, 'LIVE', liveContactMapDataSet, zoomData)

    paintContactFrequencyArrayWithColorScale(browser.contactMatrixView.colorScale, frequencies, frequencyRGBAList, browser.contactMatrixView.backgroundColor)

    await transferRGBAMatrixToLiveMapCanvas(browser.contactMatrixView.ctx_live, frequencyRGBAList, liveMapTraceLength)

}

function paintContactFrequencyArrayWithColorScale(colorScale, frequencies, frequencyRGBAList, backgroundRGB) {

    const compositeColors = (foreRGBA, backRGB) => {

        const alpha = foreRGBA.a / 255;

        const r = Math.round(alpha * foreRGBA.r + (1 - alpha) * backRGB.r);
        const g = Math.round(alpha * foreRGBA.g + (1 - alpha) * backRGB.g);
        const b = Math.round(alpha * foreRGBA.b + (1 - alpha) * backRGB.b);

        return { r, g, b };
    }


    let i = 0
    for (const frequency of frequencies) {

        const { red, green, blue, alpha } = colorScale.getColor(frequency)
        const foregroundRGBA = { r:red, g:green, b:blue, a:alpha }
        const { r, g, b } = compositeColors(foregroundRGBA, backgroundRGB)

        frequencyRGBAList[i++] = r
        frequencyRGBAList[i++] = g
        frequencyRGBAList[i++] = b
        frequencyRGBAList[i++] = 255
    }
}

function distanceThresholdEstimate(trace) {
    const { radius } = EnsembleManager.getTraceBounds(trace)
    return Math.floor(2 * radius / 4)
}

export { defaultDistanceThreshold, renderLiveMapWithContactData }

export default LiveContactMapService
