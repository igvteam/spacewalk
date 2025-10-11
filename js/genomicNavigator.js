import SpacewalkEventBus from './spacewalkEventBus.js'
import {colorRampMaterialProvider, ensembleManager, igvPanel, sceneManager} from './main.js'
import {fitToContainer, getMouseXY} from "./utils/utils"
import {appleCrayonColorRGB255, rgb255, rgb255String, threeJSColorToRGB255} from "./utils/colorUtils"
import Ribbon from "./ribbon"

let rgbTexture;
let alphaTexture;

class GenomicNavigator {

    constructor(canvasContainer, highlightColor) {

        this.canvasContainer = canvasContainer

        let canvas

        // highlight canvas
        canvas = canvasContainer.querySelector('#spacewalk_color_ramp_canvas_highlight')
        fitToContainer(canvas)
        this.highlight_ctx = canvas.getContext('2d')

        // color ramp canvas
        canvas = canvasContainer.querySelector('#spacewalk_color_ramp_canvas_rgb')
        fitToContainer(canvas)
        this.rgb_ctx = canvas.getContext('2d')

        const namespace = 'color-ramp-material-provider'

        canvasContainer.addEventListener('mousemove', event => {
            event.stopPropagation()
            this.onCanvasMouseMove(canvas, event)
        });

        canvasContainer.addEventListener('mouseenter', event => {
            event.stopPropagation()
            SpacewalkEventBus.globalBus.post({ type: 'DidEnterGenomicNavigator', data: 'DidEnterGenomicNavigator' })
        });

        canvasContainer.addEventListener('mouseleave', event => {
            event.stopPropagation()
            SpacewalkEventBus.globalBus.post({ type: 'DidLeaveGenomicNavigator', data: 'DidLeaveGenomicNavigator' })
            // this.repaint()
        });

        const { r, g, b } = highlightColor
        this.highlightColor = rgb255String( rgb255(r*255, g*255, b*255) )

        this.header = canvasContainer.querySelector('#spacewalk-trace-navigator-header')
        this.footer = canvasContainer.querySelector('#spacewalk-trace-navigator-footer')

        SpacewalkEventBus.globalBus.subscribe('DidSelectTrace', this);
        SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this);
        SpacewalkEventBus.globalBus.subscribe('DidUpdateGenomicInterpolant', this)
        SpacewalkEventBus.globalBus.subscribe('DidLeaveGenomicNavigator', this)
        SpacewalkEventBus.globalBus.subscribe('DidHideCrosshairs', this)

    }

    receiveEvent({ type, data }) {

        if ("DidSelectTrace" === type) {
            this.repaint()
        } else if ("DidLoadEnsembleFile" === type) {

            const { genomicStart, genomicEnd } = data

            this.footer.innerText = `${ Math.round(genomicStart / 1e6) }Mb`
            this.header.innerText = `${ Math.round(genomicEnd / 1e6) }Mb`

            igvPanel.materialProvider = colorRampMaterialProvider;
            this.repaint()
        } else if ("DidUpdateGenomicInterpolant" === type) {

            const { poster, interpolantList } = data

            if (this !== poster || sceneManager.renderStyle === Ribbon.renderStyle) {

                const interpolantWindowList = ensembleManager.getGenomicInterpolantWindowList(interpolantList)
                if (interpolantWindowList) {
                    this.highlightWithInterpolantWindowList(interpolantWindowList.map(({genomicExtent}) => genomicExtent));
                }

            }
        } else if ('DidHideCrosshairs' === type || 'DidLeaveGenomicNavigator' === type) {
            this.repaint()
        }


    }

    onCanvasMouseMove(canvas, event) {

        if (ensembleManager.currentTrace) {

            let { yNormalized } = getMouseXY(canvas, event)
            const interpolantList = [ 1.0 - yNormalized ];

            const interpolantWindowList = ensembleManager.getGenomicInterpolantWindowList(interpolantList)

            if (interpolantWindowList) {
                SpacewalkEventBus.globalBus.post({ type: 'DidUpdateGenomicInterpolant', data: { poster: this, interpolantList } });
            } else {
                // When there is no interpolant, publish interpolantList as undefined. Subscribers will handle this case.
                SpacewalkEventBus.globalBus.post({ type: 'DidUpdateGenomicInterpolant', data: { poster: this } });
            }

        }

    }

    resize(sceneManagerContainer) {
        const { height } = sceneManagerContainer.getBoundingClientRect()

        this.canvasContainer.style.height = `${ height }px`

        fitToContainer(this.highlight_ctx.canvas)
        fitToContainer(this.rgb_ctx.canvas)

        this.repaint()

    }

    highlightWithInterpolantWindowList(interpolantWindowList) {

        if (interpolantWindowList) {
            this.paintWithInterpolantWindowList(interpolantWindowList);
        }

    }

    paintWithInterpolantWindowList(interpolantWindowList) {

        this.highlight_ctx.clearRect(0, 0, this.highlight_ctx.canvas.width, this.highlight_ctx.canvas.height);

        if (interpolantWindowList) {

            this.highlight_ctx.fillStyle = this.highlightColor;

            for (let { start, end } of interpolantWindowList) {

                const h = Math.round((end - start) * this.highlight_ctx.canvas.height);
                const y = Math.round(start * this.highlight_ctx.canvas.height);

                const yy = this.highlight_ctx.canvas.height - (h + y);

                const h_rendered = Math.max(1, h);
                this.highlight_ctx.fillRect(0, yy, this.highlight_ctx.canvas.width, h_rendered);

            }

        }

    }

    repaint() {

        if (undefined === ensembleManager.currentTrace) {
            return;
        }

        // repaint color ramp
        this.rgb_ctx.fillStyle = rgb255String( appleCrayonColorRGB255('snow') );
        this.rgb_ctx.fillRect(0, 0, this.rgb_ctx.canvas.width, this.rgb_ctx.canvas.height);

        const genomicExtentList = ensembleManager.getCurrentGenomicExtentList()
        for (let { interpolant, start, end } of genomicExtentList) {

            const rgb = igvPanel.materialProvider.colorForInterpolant(interpolant)
            const rgb255 = threeJSColorToRGB255(rgb)
            this.rgb_ctx.fillStyle = rgb255String(rgb255)

            const h = Math.ceil((end - start) * this.rgb_ctx.canvas.height);
            const y = Math.round(start * (this.rgb_ctx.canvas.height));

            const yy = Math.max(0, this.rgb_ctx.canvas.height - (h + y));

            this.rgb_ctx.fillRect(0, yy, this.rgb_ctx.canvas.width, h);
        }

        // clear highlight canvas
        this.highlight_ctx.clearRect(0, 0, this.highlight_ctx.canvas.width, this.highlight_ctx.canvas.height);

    }

    renderLoopHelper () {

        if (rgbTexture) {
            rgbTexture.needsUpdate = true;
        }

        if (alphaTexture) {
            alphaTexture.needsUpdate = true;
        }

    }

    show() {
        this.highlight_ctx.canvas.style.display = 'block';
        this.rgb_ctx.canvas.style.display = 'block';
    }

    hide() {
        this.highlight_ctx.canvas.style.display = 'none';
        this.rgb_ctx.canvas.style.display = 'none';
    }

}

export default GenomicNavigator
