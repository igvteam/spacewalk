import hic from '../../node_modules/juicebox.js/js/index.js'
import {ensembleManager, igvPanel, juiceboxPanel} from "../app.js"
import EnsembleManager from "../ensembleManager.js"
import SpacewalkEventBus from "../spacewalkEventBus.js"
import {hideGlobalSpinner, showGlobalSpinner, transferRGBAMatrixToLiveMapCanvas} from "../utils/utils.js"
import {clamp} from "../utils/mathUtils.js"
import {compositeColors} from "../utils/colorUtils.js"
import {enableLiveMaps} from "../utils/liveMapUtils"
import {postMessageToWorker} from "../utils/webWorkerUtils"

const maxDistanceThreshold = 1e4
const defaultDistanceThreshold = 256

class LiveContactMapService {

    constructor (distanceThreshold) {

        this.distanceThreshold = distanceThreshold

        this.input = document.querySelector('#spacewalk_contact_frequency_map_adjustment_select_input')
        this.input.value = distanceThreshold.toString()

        document.querySelector('#hic-live-contact-frequency-map-threshold-button').addEventListener('click', () => {

            this.distanceThreshold = clamp(parseInt(this.input.value, 10), 0, maxDistanceThreshold)

            window.setTimeout(() => {
                this.updateEnsembleContactFrequencyCanvas(this.distanceThreshold)
            }, 0)
        })

        this.worker = new Worker(new URL('./liveContactMapWorker.js', import.meta.url), { type: 'module' })

        SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this);

    }

    receiveEvent({ type, data }) {

        if ("DidLoadEnsembleFile" === type) {

            const ctx = juiceboxPanel.browser.contactMatrixView.ctx_live
            ctx.transferFromImageBitmap(null)

            this.contactFrequencies = undefined
            this.rgbaMatrix = undefined

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

    async updateEnsembleContactFrequencyCanvas(distanceThresholdOrUndefined) {

        const status = await enableLiveMaps()

        if (true === status) {

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

            let result
            try {
                console.log(`Live Contact Map ${ data.traceOrEnsemble } payload sent to worker`)
                result = await postMessageToWorker(this.worker, data)
                hideGlobalSpinner()
            } catch (err) {
                hideGlobalSpinner()
                console.error('Error: Live Contact Map', err)

            }

            const traceLength = ensembleManager.getLiveMapTraceLength()
            const arrayLength = traceLength * traceLength * 4

            if (undefined === this.rgbaMatrix || this.rgbaMatrix.length !== arrayLength) {
                this.rgbaMatrix = new Uint8ClampedArray(arrayLength)
            } else {
                this.rgbaMatrix.fill(0)
            }

            this.contactFrequencies = result.workerValuesBuffer
            juiceboxPanel.createContactRecordList(this.contactFrequencies, traceLength)

            await juiceboxPanel.renderLiveMapWithContactData(this.contactFrequencies, this.rgbaMatrix, traceLength)

        }

    }
}

async function renderLiveMapWithContactData(browser, state, liveContactMapDataSet, frequencies, frequencyRGBAList, liveMapTraceLength) {

    browser.eventBus.post(hic.HICEvent('MapLoad', { dataset: liveContactMapDataSet, state }))

    browser.locusGoto.doChangeLocus({ dataset: liveContactMapDataSet, state })

    const zoomIndexA = state.zoom
    const { chr1, chr2 } = state
    const zoomData = liveContactMapDataSet.getZoomDataByIndex(chr1, chr2, zoomIndexA)

    browser.contactMatrixView.checkColorScale_sw(browser, state, 'LIVE', liveContactMapDataSet, zoomData)

    paintContactMapGBAMatrix(frequencies, frequencyRGBAList, browser.contactMatrixView.colorScale, browser.contactMatrixView.backgroundColor)

    await transferRGBAMatrixToLiveMapCanvas(browser.contactMatrixView.ctx_live, frequencyRGBAList, liveMapTraceLength)

}

function paintContactMapGBAMatrix(frequencies, rgbaMatrix, colorScale, backgroundRGB) {

    let i = 0
    for (const frequency of frequencies) {

        const { red, green, blue, alpha } = colorScale.getColor(frequency)
        const foregroundRGBA = { r:red, g:green, b:blue, a:alpha }
        const { r, g, b } = compositeColors(foregroundRGBA, backgroundRGB)

        rgbaMatrix[i++] = r
        rgbaMatrix[i++] = g
        rgbaMatrix[i++] = b
        rgbaMatrix[i++] = 255
    }
}

function distanceThresholdEstimate(trace) {
    const { radius } = EnsembleManager.getTraceBounds(trace)
    return Math.floor(2 * radius / 4)
}

export { defaultDistanceThreshold, renderLiveMapWithContactData }

export default LiveContactMapService
