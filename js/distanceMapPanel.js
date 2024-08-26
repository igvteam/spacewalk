import {
    ballAndStick,
    colorMapManager,
    colorRampMaterialProvider,
    ensembleManager, igvPanel,
    juiceboxPanel,
    sceneManager
} from "./app.js";
import { clamp } from "./utils/math.js";
import Panel from "./panel.js";
import { appleCrayonColorRGB255, threeJSColorToRGB255 } from "./utils/color.js";
import {clearCanvasArray, renderArrayToCanvas} from "./utils/utils.js"
import SpacewalkEventBus from "./spacewalkEventBus.js"
import SWBDatasource from "./datasource/SWBDatasource.js"
import {HICEvent} from "./juicebox/juiceboxHelpful.js"
import BallAndStick from "./ballAndStick.js"

const kDistanceUndefined = -1

let canvasArray = undefined

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

        // trace canvas and context
        canvas = $canvas_container.find('#spacewalk_distance_map_canvas_trace').get(0);
        canvas.width = $canvas_container.width();
        canvas.height = $canvas_container.height();

        this.ctx_trace = canvas.getContext('bitmaprenderer');

        // ensemble canvas and context
        canvas = $canvas_container.find('#spacewalk_distance_map_canvas_ensemble').get(0);
        canvas.width = $canvas_container.width();
        canvas.height = $canvas_container.height();

        this.ctx_ensemble = canvas.getContext('bitmaprenderer');

        const canvas_container = $canvas_container.get(0)
        this.canvas_container = canvas_container

        const horizontalLine = document.createElement('div')
        horizontalLine.classList.add('crosshair', 'horizontal')
        canvas_container.appendChild(horizontalLine)
        this.horizontalLine = horizontalLine

        const verticalLine = document.createElement('div')
        verticalLine.classList.add('crosshair', 'vertical')
        canvas_container.appendChild(verticalLine)
        this.verticalLine = verticalLine

        this.willShowCrosshairs = undefined

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
            // juiceboxPanel.browser.eventBus.post(HICEvent('DidHideCrosshairs', 'DidHideCrosshairs', false))
            SpacewalkEventBus.globalBus.post({ type: 'DidLeaveGenomicNavigator', data: 'DidLeaveGenomicNavigator' });
        })

        canvas_container.addEventListener('mousemove', event => {

            event.preventDefault()
            event.stopPropagation()

            if (this.willShowCrosshairs) {

                const { left, top, width, height} = canvas_container.getBoundingClientRect()
                const x = event.clientX - left
                const y = event.clientY - top

                horizontalLine.style.top = `${y}px`
                verticalLine.style.left = `${x}px`

                const xNormalized = x / width
                const yNormalized = y / height

                const interpolantList = [ xNormalized, yNormalized ]

                SpacewalkEventBus.globalBus.post({ type: 'DidUpdateGenomicInterpolant', data: { poster: this, interpolantList } })
            }

        });

        this.doUpdateTrace = this.doUpdateEnsemble = undefined

        this.worker = new Worker(new URL('./distanceMapWorker.js', import.meta.url), { type: 'module' })

        this.worker.addEventListener('message', ({ data }) => {

            document.querySelector('#spacewalk-distance-map-spinner').style.display = 'none'

            const traceLength = ensembleManager.getLiveMapTraceLength()

            if (undefined === canvasArray) {
                canvasArray = new Uint8ClampedArray(traceLength * traceLength * 4)
            }

            clearCanvasArray(canvasArray, traceLength)

            if ('trace' === data.traceOrEnsemble) {
                populateCanvasArray(canvasArray, data.workerDistanceBuffer, data.maxDistance, colorMapManager.dictionary['juicebox_default'])
                renderArrayToCanvas(this.ctx_trace, canvasArray)
            } else {
                populateCanvasArray(canvasArray, data.workerDistanceBuffer, data.maxDistance, colorMapManager.dictionary['juicebox_default'])
                renderArrayToCanvas(this.ctx_ensemble, canvasArray)
            }


        }, false)

        SpacewalkEventBus.globalBus.subscribe('DidSelectTrace', this);
        SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this);

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

            canvasArray = undefined
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

function populateCanvasArray(array, distances, maximumDistance, colorMap) {

    let i = 0;
    const { r, g, b } = appleCrayonColorRGB255('magnesium');
    for (let x = 0; x < distances.length; x++) {
        array[i++] = r;
        array[i++] = g;
        array[i++] = b;
        array[i++] = 255;
    }


    const scale = colorMap.length - 1;

    i = 0;
    for (let distance of distances) {

        if (kDistanceUndefined !== distance) {

            const interpolant = distance/maximumDistance
            if (interpolant < 0 || 1 < interpolant) {
                console.log(`${ Date.now() } populateDistanceCanvasArray - interpolant out of range ${ interpolant }`)
            }

            const interpolantFlipped = 1.0 - clamp(interpolant, 0, 1)
            const interpolantScaled = scale * interpolantFlipped

            const floorInterpolantScaled = Math.floor(interpolantScaled)
            const result = colorMap[ floorInterpolantScaled ][ 'threejs' ]
            const { r, g, b } = threeJSColorToRGB255(result)

            array[i] = r;
            array[i + 1] = g;
            array[i + 2] = b;
            array[i + 3] = 255;
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
