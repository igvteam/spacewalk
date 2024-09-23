import {ensembleManager, juiceboxPanel} from "../app.js";
import { clamp } from "../utils/mathUtils.js";
import { appleCrayonColorRGB255 } from "../utils/colorUtils.js";
import { fillRGBAMatrix, hideGlobalSpinner, showGlobalSpinner, transferRGBAMatrixToLiveMapCanvas } from "../utils/utils.js"
import {compositeColors} from "../utils/colorUtils.js"
import SpacewalkEventBus from "../spacewalkEventBus.js"
import SWBDatasource from "../datasource/SWBDatasource.js"

const kDistanceUndefined = -1

class LiveDistanceMapService {

    constructor () {

        this.configureMouseHandlers()

        this.worker = new Worker(new URL('./liveDistanceMapWorker.js', import.meta.url), {type: 'module'})

        this.worker.addEventListener('message', async ( { data }) => {
            await processWebWorkerResults.call(this, data)
        }, false)

        // SpacewalkEventBus.globalBus.subscribe('DidSelectTrace', this);
        SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this);

    }

    configureMouseHandlers(){

        this.ensembleToggleElement = document.getElementById('spacewalk-live-distance-map-toggle-ensemble')
        this.ensembleToggleElement.addEventListener('click', () => {
            if (ensembleManager.datasource instanceof SWBDatasource) {
                ensembleManager.datasource.distanceMapPresentationHandler(() => {
                    this.updateEnsembleAverageDistanceCanvas(ensembleManager.getLiveMapTraceLength(), ensembleManager.getLiveMapVertexLists())
                })
            }
        })

        this.traceToggleElement = document.getElementById('spacewalk-live-distance-map-toggle-trace')
        this.traceToggleElement.addEventListener('click', () => {
            if (ensembleManager.datasource instanceof SWBDatasource) {
                ensembleManager.datasource.distanceMapPresentationHandler(() => {
                    this.updateTraceDistanceCanvas(ensembleManager.getLiveMapTraceLength(), ensembleManager.currentTrace)
                })
            }
        })

        this.calculateDistanceMapButton = document.getElementById('hic-calculation-live-distance-button')

        this.calculateDistanceMapButton.addEventListener('click', event => {
            if (ensembleManager.datasource instanceof SWBDatasource) {
                ensembleManager.datasource.distanceMapPresentationHandler(() => {
                    if (this.isEnsembleToggleChecked()) {
                        this.updateEnsembleAverageDistanceCanvas(ensembleManager.getLiveMapTraceLength(), ensembleManager.getLiveMapVertexLists())
                    } else if (this.isTraceToggleChecked()) {
                        this.updateTraceDistanceCanvas(ensembleManager.getLiveMapTraceLength(), ensembleManager.currentTrace)
                    }
                })
            }
        })

    }

    isTraceToggleChecked() {
        return true === this.traceToggleElement.checked
    }

    isEnsembleToggleChecked() {
        return true === this.ensembleToggleElement.checked
    }

    receiveEvent({ type, data }) {

        if ("DidLoadEnsembleFile" === type) {

            const ctx = juiceboxPanel.browser.contactMatrixView.ctx_live_distance
            ctx.transferFromImageBitmap(null)

            this.rgbaMatrix = undefined
            this.distances = undefined
            this.maxDistance = undefined
        }

    }

    getClassName(){
        return 'LiveDistanceMapService'
    }

    updateTraceDistanceCanvas(traceLength, trace) {

        showGlobalSpinner()

        const vertices = ensembleManager.getLiveMapTraceVertices(trace)

        const data =
            {
                traceOrEnsemble: 'trace',
                traceLength,
                verticesString: JSON.stringify(vertices),
            }

        this.worker.postMessage(data)

    }

    updateEnsembleAverageDistanceCanvas(traceLength, vertexLists){

        showGlobalSpinner()

        const data =
            {
                traceOrEnsemble: 'ensemble',
                traceLength,
                vertexListsString: JSON.stringify(vertexLists)
            }

        this.worker.postMessage(data)

    }

}

async function processWebWorkerResults(data) {

    const traceLength = ensembleManager.getLiveMapTraceLength()
    const arrayLength = traceLength * traceLength * 4

    if (undefined === this.rgbaMatrix || this.rgbaMatrix.length !== arrayLength) {
        this.rgbaMatrix = new Uint8ClampedArray(arrayLength)
    } else {
        this.rgbaMatrix.fill(0)
    }

    this.distances = data.workerDistanceBuffer
    this.maxDistance = data.maxDistance
    await juiceboxPanel.renderLiveMapWithDistanceData(this.distances, this.maxDistance, this.rgbaMatrix, ensembleManager.getLiveMapTraceLength())

    hideGlobalSpinner()
}

async function renderLiveMapWithDistanceData(browser, distances, maxDistance, rgbaMatrix, liveMapTraceLength) {
    paintDistanceMapRGBAMatrix(distances, maxDistance, rgbaMatrix, browser.contactMatrixView.colorScale, browser.contactMatrixView.backgroundColor)
    await transferRGBAMatrixToLiveMapCanvas(browser.contactMatrixView.ctx_live_distance, rgbaMatrix, liveMapTraceLength)
}

function paintDistanceMapRGBAMatrix(distances, maxDistance, rgbaMatrix, colorScale, backgroundRGB) {

    fillRGBAMatrix(rgbaMatrix, distances.length, appleCrayonColorRGB255('tin'))

    let i = 0;
    const { r, g, b } = colorScale.getColorComponents()

    for (let distance of distances) {

        if (kDistanceUndefined !== distance) {

            distance = clamp(distance, 0, maxDistance)
            const nearness = maxDistance - distance

            const rawInterpolant = nearness/maxDistance
            if (rawInterpolant < 0 || 1 < rawInterpolant) {
                console.warn(`${ Date.now() } populateCanvasArray - interpolant out of range ${ rawInterpolant }`)
            }

            const alpha = Math.floor(255 * clamp(nearness, 0, maxDistance) / maxDistance)
            const foregroundRGBA = { r, g, b, a:alpha }

            const { r:comp_r, g:comp_g, b:comp_b } = compositeColors(foregroundRGBA, backgroundRGB)

            rgbaMatrix[i    ] = comp_r;
            rgbaMatrix[i + 1] = comp_g;
            rgbaMatrix[i + 2] = comp_b;
            rgbaMatrix[i + 3] = 255;
        }

        i += 4;
    }

}

export { renderLiveMapWithDistanceData }

export default LiveDistanceMapService
