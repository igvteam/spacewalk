import { colorMapManager, ensembleManager } from "./app.js";
import { clamp } from "./utils/mathUtils.js";
import Panel from "./panel.js";
import { appleCrayonColorRGB255, threeJSColorToRGB255 } from "./utils/colorUtils.js";
import {fillRGBAMatrix, transferRGBAMatrixToLiveDistanceMapCanvas} from "./utils/utils.js"
import SpacewalkEventBus from "./spacewalkEventBus.js"
import SWBDatasource from "./datasource/SWBDatasource.js"

const kDistanceUndefined = -1

class DistanceMapPanel extends Panel {

    constructor ({ container, panel, isHidden }) {

        const xFunction = (cw, w) => {
            return cw - w * 1.1;
        };

        const yFunction = (ch, h) => {
            return ch - (h * 1.1);
        };

        super({ container, panel, isHidden, xFunction, yFunction });

        const $canvas_container = this.$panel.find('#spacewalk_distance_map_panel_container');

        let canvas;

        // trace
        canvas = $canvas_container.find('#spacewalk_distance_map_canvas_trace').get(0);
        canvas.width = $canvas_container.width();
        canvas.height = $canvas_container.height();

        this.ctx_trace = canvas.getContext('bitmaprenderer');

        // ensemble
        canvas = $canvas_container.find('#spacewalk_distance_map_canvas_ensemble').get(0);
        canvas.width = $canvas_container.width();
        canvas.height = $canvas_container.height();

        this.ctx_ensemble = canvas.getContext('bitmaprenderer');

        const canvas_container = $canvas_container.get(0)
        this.canvas_container = canvas_container

        this.configureMouseHandlers(canvas_container)

        this.configureWebWorker(new Worker(new URL('./distanceMapWorker.js', import.meta.url), {type: 'module'}))

        document.getElementById('hic-live-distance-map-toggle-input').addEventListener('click', event => {

            const label = document.getElementById('hic-live-distance-map-toggle-label')

            if (label.innerText === 'Ensemble') {
                label.innerText = 'Trace';
            } else {
                label.innerText = 'Ensemble';
            }

        })

        SpacewalkEventBus.globalBus.subscribe('DidSelectTrace', this);
        SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this);

        this.rgbaMatrix = undefined
        this.willShowCrosshairs = undefined
        this.doUpdateTrace = undefined
        this.doUpdateEnsemble = undefined

    }

    configureWebWorker(worker) {
        this.worker = worker
        this.worker.addEventListener('message', ({data}) => {
            processWebWorkerResults.call(this, data)
        }, false)
    }

    configureMouseHandlers(canvas_container){

        const horizontalLine = document.createElement('div')
        horizontalLine.classList.add('crosshair', 'horizontal')
        canvas_container.appendChild(horizontalLine)
        this.horizontalLine = horizontalLine

        const verticalLine = document.createElement('div')
        verticalLine.classList.add('crosshair', 'vertical')
        canvas_container.appendChild(verticalLine)
        this.verticalLine = verticalLine

        canvas_container.addEventListener('mousedown', event => {
            event.preventDefault()
            event.stopPropagation()

            if (undefined === this.willShowCrosshairs) {
                this.willShowCrosshairs = true
                this.showCrosshairs(event)
            }
        })

        canvas_container.addEventListener('mouseup', event => {
            event.preventDefault()
            event.stopPropagation()

            this.hideCrosshairs()
            this.willShowCrosshairs = undefined
            SpacewalkEventBus.globalBus.post({type: 'DidLeaveGenomicNavigator', data: 'DidLeaveGenomicNavigator'});
        })

        canvas_container.addEventListener('mousemove', event => {

            event.preventDefault()
            event.stopPropagation()

            if (this.willShowCrosshairs) {

                const {left, top, width, height} = canvas_container.getBoundingClientRect()
                const x = event.clientX - left
                const y = event.clientY - top

                horizontalLine.style.top = `${y}px`
                verticalLine.style.left = `${x}px`

                const xNormalized = x / width
                const yNormalized = y / height

                const interpolantList = [xNormalized, yNormalized]

                SpacewalkEventBus.globalBus.post({
                    type: 'DidUpdateGenomicInterpolant',
                    data: {poster: this, interpolantList}
                })
            }

        });
    }

    receiveEvent({ type, data }) {

        if ("DidSelectTrace" === type) {

            if (false === this.isHidden) {
                const { trace } = data
                this.updateTraceDistanceCanvas(ensembleManager.getLiveMapTraceLength(), trace)
                this.doUpdateTrace = undefined
            } else {
                this.doUpdateTrace = true
            }

        } else if ("DidLoadEnsembleFile" === type) {

            this.dismiss()

            this.rgbaMatrix = undefined
            this.doUpdateTrace = this.doUpdateEnsemble = true

            this.ctx_trace.transferFromImageBitmap(null)
            this.ctx_ensemble.transferFromImageBitmap(null)

            // if (false === this.isHidden) {
            //     this.updateEnsembleAverageDistanceCanvas(ensembleManager.getLiveMapTraceLength(), ensembleManager.getLiveMapVertexLists())
            //     const { trace } = data
            //     this.updateTraceDistanceCanvas(ensembleManager.getLiveMapTraceLength(), trace)
            //     this.doUpdateTrace = this.doUpdateEnsemble = undefined
            // }

        }

        super.receiveEvent({ type, data });
    }

    present() {

        if (ensembleManager.datasource instanceof SWBDatasource) {

            ensembleManager.datasource.distanceMapPresentationHandler(() => {

                if (true === this.doUpdateEnsemble) {
                    this.updateEnsembleAverageDistanceCanvas(ensembleManager.getLiveMapTraceLength(), ensembleManager.getLiveMapVertexLists())
                    this.doUpdateEnsemble = undefined
                }

                if (true === this.doUpdateTrace) {
                    this.updateTraceDistanceCanvas(ensembleManager.getLiveMapTraceLength(), ensembleManager.currentTrace)
                    this.doUpdateTrace = undefined
                }

                super.present()

            })

        } else {

            if (true === this.doUpdateEnsemble) {
                this.updateEnsembleAverageDistanceCanvas(ensembleManager.getLiveMapTraceLength(), ensembleManager.getLiveMapVertexLists())
                this.doUpdateEnsemble = undefined
            }

            if (true === this.doUpdateTrace) {
                this.updateTraceDistanceCanvas(ensembleManager.getLiveMapTraceLength(), ensembleManager.currentTrace)
                this.doUpdateTrace = undefined
            }

            super.present()

        }

    }

    getClassName(){ return 'DistanceMapPanel' }

    updateTraceDistanceCanvas(traceLength, trace) {

        document.querySelector('#spacewalk-distance-map-spinner').style.display = 'block'

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

        document.querySelector('#spacewalk-distance-map-spinner').style.display = 'block'

        const data =
            {
                traceOrEnsemble: 'ensemble',
                traceLength,
                vertexListsString: JSON.stringify(vertexLists)
            }

        this.worker.postMessage(data)

    }

    showCrosshairs({ clientX, clientY }) {

        this.verticalLine.style.display = this.horizontalLine.style.display = 'block'

        const { left, top} = this.canvas_container.getBoundingClientRect()
        const x = clientX - left
        const y = clientY - top

        this.horizontalLine.style.top = `${y}px`
        this.verticalLine.style.left = `${x}px`
    }

    hideCrosshairs() {
        this.verticalLine.style.display = this.horizontalLine.style.display = 'none'
    }
}

function processWebWorkerResults(data) {

    document.querySelector('#spacewalk-distance-map-spinner').style.display = 'none'

    const traceLength = ensembleManager.getLiveMapTraceLength()

    if (undefined === this.rgbaMatrix) {
        this.rgbaMatrix = new Uint8ClampedArray(traceLength * traceLength * 4)
    }

    if ('trace' === data.traceOrEnsemble) {
        setDistanceMapRGBAMatrix(this.rgbaMatrix, data.workerDistanceBuffer, data.maxDistance, colorMapManager.dictionary['juicebox_default'])
        transferRGBAMatrixToLiveDistanceMapCanvas(this.ctx_trace, this.rgbaMatrix, traceLength)
    } else {
        setDistanceMapRGBAMatrix(this.rgbaMatrix, data.workerDistanceBuffer, data.maxDistance, colorMapManager.dictionary['juicebox_default'])
        transferRGBAMatrixToLiveDistanceMapCanvas(this.ctx_ensemble, this.rgbaMatrix, traceLength)
    }
}

function setDistanceMapRGBAMatrix(rgbaMatrix, distances, maximumDistance, colorMap) {

    fillRGBAMatrix(rgbaMatrix, distances.length, appleCrayonColorRGB255('tin'))

    const scale = colorMap.length - 1;

    let i = 0;
    for (let distance of distances) {

        if (kDistanceUndefined !== distance) {

            distance = clamp(distance, 0, maximumDistance)
            const nearness = maximumDistance - distance

            const rawInterpolant = nearness/maximumDistance
            if (rawInterpolant < 0 || 1 < rawInterpolant) {
                console.warn(`${ Date.now() } populateCanvasArray - interpolant out of range ${ rawInterpolant }`)
            }

            const interpolant = clamp(nearness, 0, maximumDistance) / maximumDistance
            const colorIndex = Math.floor(scale * interpolant)

            const { r, g, b } = threeJSColorToRGB255(colorMap[ colorIndex ][ 'threejs' ])

            rgbaMatrix[i] = r;
            rgbaMatrix[i + 1] = g;
            rgbaMatrix[i + 2] = b;
            rgbaMatrix[i + 3] = 255;
        }

        i += 4;
    }

}

export function distanceMapPanelConfigurator({ container, isHidden }) {

    return {
        container,
        panel: document.querySelector('#spacewalk_distance_map_panel'),
        isHidden
    };

}

export default DistanceMapPanel;
