import {ensembleManager, juiceboxPanel} from "../app.js"
import EnsembleManager from "../ensembleManager.js"
import SpacewalkEventBus from "../spacewalkEventBus.js"
import {hideGlobalSpinner, showGlobalSpinner} from "../utils/utils.js"
import {clamp} from "../utils/mathUtils.js"
import {enableLiveMaps} from "../utils/liveMapUtils.js"
import {postMessageToWorker} from "../utils/webWorkerUtils.js"

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

function distanceThresholdEstimate(trace) {
    const { radius } = EnsembleManager.getTraceBounds(trace)
    return Math.floor(2 * radius / 4)
}

export { defaultDistanceThreshold }

export default LiveContactMapService
