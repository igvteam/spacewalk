import hic from 'juicebox.js'
import { StringUtils } from 'igv-utils'
import { AlertSingleton } from 'igv-widgets'
import SpacewalkEventBus from './spacewalkEventBus.js'
import Panel from './panel.js'
import {contactFrequencyMapPanel, ensembleManager} from './app.js'
import { HICEvent } from "./juiceboxHelpful.js"
import {paintContactFrequencyArrayWithColorScale, transferContactFrequencyArrayToCanvas} from './utils.js'

const imageTileDimension = 685

class JuiceboxPanel extends Panel {

    constructor ({ container, panel, isHidden }) {

        const xFunction = (cw, w) => {
            return (cw - w)/2;
        };

        const yFunction = (ch, h) => {
            return ch - (h * 1.05);
        };

        super({ container, panel, isHidden, xFunction, yFunction });

        this.$panel.on(`mouseenter.${ this.namespace }.noodle-ribbon-render`, (event) => {
            event.stopPropagation();
            SpacewalkEventBus.globalBus.post({ type: 'DidEnterGenomicNavigator', data: 'DidEnterGenomicNavigator' });
        });

        this.$panel.on(`mouseleave.${ this.namespace }.noodle-ribbon-render`, (event) => {
            event.stopPropagation();
            SpacewalkEventBus.globalBus.post({ type: 'DidLeaveGenomicNavigator', data: 'DidLeaveGenomicNavigator' });
        });


    }

    getClassName(){ return 'JuiceboxPanel' }

    receiveEvent({ type, data }) {

        super.receiveEvent({ type, data });

        if ('DidHideCrosshairs' === type) {
            SpacewalkEventBus.globalBus.post({ type: 'DidLeaveGUI', data: 'DidLeaveGUI' })
        }
    }

    async initialize(container, config) {

        let session

        if (config.browsers) {
            session = Object.assign({ queryParametersSupported: false }, config)
        } else {
            const { width, height } = config
            session =
                {
                    browsers:
                        [
                            {
                                width,
                                height,
                                queryParametersSupported: false
                            }
                        ]
                }
        }

        try {
            await hic.restoreSession(container, session)
            this.locus = config.locus
        } catch (e) {
            console.warn(error.message)
            AlertSingleton.present(`Error initializing Juicebox ${ error.message }`)
        }

        if (hic.getCurrentBrowser()) {

            juiceboxAdditions()

            this.configureMouseHandlers()
        }

        document.querySelector('#hic-live-contact-frequency-map-button').addEventListener('click', e => {
            console.log('hic-live-contact-frequency-map-button was clicked')
            contactFrequencyMapPanel.calculateContactFrequencies()
            this.present()
        })


        hic.getCurrentBrowser().eventBus.subscribe("MapLoad", () => {
            const { chr, genomicStart, genomicEnd } = ensembleManager.locus
            this.goto({ chr, start: genomicStart, end: genomicEnd })
        })

    }

    async locusDidChange({ chr, genomicStart, genomicEnd }) {

        if (this.isContactMapLoaded() && hic.getCurrentBrowser().dataset.isLiveContactMapDataSet !== true) {
            try {
                await this.goto({ chr, start: genomicStart, end: genomicEnd })
            } catch (e) {
                AlertSingleton.present(e.message)
            }
        }
    }

    configureMouseHandlers() {

        hic.getCurrentBrowser().eventBus.subscribe('DidHideCrosshairs', this)

        hic.getCurrentBrowser().contactMatrixView.$viewport.on(`mouseenter.${ this.namespace }`, (event) => {
            event.stopPropagation()
            SpacewalkEventBus.globalBus.post({ type: 'DidEnterGUI', data: this })
        })

        hic.getCurrentBrowser().contactMatrixView.$viewport.on(`mouseleave.${ this.namespace }`, (event) => {
            event.stopPropagation();
            SpacewalkEventBus.globalBus.post({ type: 'DidLeaveGUI', data: this })
        })

        hic.getCurrentBrowser().setCustomCrosshairsHandler(({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY }) => {
            juiceboxMouseHandler({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY });
        })

    }

    async goto({ chr, start, end }) {

        if (this.isContactMapLoaded()) {
            try {
                await hic.getCurrentBrowser().parseGotoInput(`${chr}:${start}-${end}`)
            } catch (error) {
                console.warn(error.message)
            }
        }

    }

    async loadHicFile(url, name, mapType) {

        try {
            const isControl = ('control-map' === mapType)

            const config = { url, name, isControl }

            if (false === isControl) {

                this.present()

                await hic.getCurrentBrowser().loadHicFile(config)

            }

        } catch (e) {
            console.error(e.message)
            AlertSingleton.present(`Error loading ${ url }: ${ e }`)
        }

        const { chr, genomicStart, genomicEnd } = ensembleManager.locus

        try {
            await hic.getCurrentBrowser().parseGotoInput(`${chr}:${genomicStart}-${genomicEnd}`)
        } catch (error) {
            console.warn(error.message)
        }

        $('#spacewalk_info_panel_juicebox').text( this.blurb() )

    }

    blurb() {
        return `${ hic.getCurrentBrowser().$contactMaplabel.text() }`
    }

    isContactMapLoaded() {
        return (hic.getCurrentBrowser() && hic.getCurrentBrowser().dataset)
    }

}

function juiceboxAdditions() {

    hic.ContactMatrixView.prototype.renderWithLiveContactFrequencyData = async function (state, liveContactMapDataSet, data, contactFrequencyArray) {

        this.ctx.canvas.style.display = 'none'
        this.ctx_live.canvas.style.display = 'block'

        const zoomIndexA = state.zoom
        const { chr1, chr2 } = state
        const zoomData = liveContactMapDataSet.getZoomDataByIndex(chr1, chr2, zoomIndexA)

        // Clear caches
        this.colorScaleThresholdCache = {}
        this.imageTileCache = {}
        this.imageTileCacheKeys = []

        this.checkColorScale_sw(state, 'LIVE', liveContactMapDataSet, zoomData)

        paintContactFrequencyArrayWithColorScale(this.colorScale, data.workerValuesBuffer)

        // Render by copying image data to display canvas bitmap render context
        await transferContactFrequencyArrayToCanvas(this.ctx_live, contactFrequencyArray)

        const browser = hic.getCurrentBrowser()

        // Update UI
        browser.state = state
        browser.dataset = liveContactMapDataSet

        browser.layoutController.xAxisRuler.update()
        browser.layoutController.yAxisRuler.update()

    }

    hic.ContactMatrixView.prototype.checkColorScale_sw = function (state, displayMode, liveContactMapDataSet, zoomData) {

        const colorScaleKey = createColorScaleKey(state, displayMode)

        let percentile = computeContactRecordsPercentile(liveContactMapDataSet.contactRecordList, 95)

        if (!isNaN(percentile)) {

            if (0 === zoomData.chr1.index) {
                // Heuristic for whole genome view
                percentile *= 4
            }

            this.colorScale = new hic.ColorScale(this.colorScale)

            this.colorScale.setThreshold(percentile)

            this.browser.eventBus.post(HICEvent("ColorScale", this.colorScale))

            this.colorScaleThresholdCache[colorScaleKey] = percentile

        }

        return this.colorScale

    }

    hic.HicState.prototype.description = function(genome, binSize, width) {

        const { chr1, x, pixelSize } = this

        // bp = bin * bp-per-bin
        const xBP = x * binSize

        // bin = pixel / pixel-per-bin
        const widthBin = width / pixelSize

        // bp = bin * bp-per-bin
        const widthBP = widthBin * binSize

        const xEnd = x + widthBin

        const xEndBP = xBP + widthBP

        // chromosome length - bp & bin
        const { name, size:lengthBP } = genome.getChromosomeAtIndex(chr1)
        const lengthBin = lengthBP / binSize

        const f = StringUtils.numberFormatter(width)
        const d = StringUtils.numberFormatter(x)
        const g = StringUtils.numberFormatter(xBP)
        const a = StringUtils.numberFormatter(lengthBP)
        const b = StringUtils.numberFormatter(lengthBin)
        const c = StringUtils.numberFormatter(binSize)
        const e = StringUtils.numberFormatter(pixelSize)

        const strings =
            [
                `${ name }`,
                `Screen Width\npixel(${f}) bin(${ StringUtils.numberFormatter(widthBin)}) bp(${ StringUtils.numberFormatter(widthBP)})`,
                `Start\nbin(${d}) bp(${g})\nEnd\nbin(${ StringUtils.numberFormatter(xEnd) }) bp(${ StringUtils.numberFormatter(xEndBP)})`,
                `Bin Size\nbp-per-bin(${c})\nPixel Size\npixel-per-bin(${e})`
            ]

        return `\n${ strings.join('\n') }`
    }

}

function createColorScaleKey(state, displayMode) {
    return "" + state.chr1 + "_" + state.chr2 + "_" + state.zoom + "_" + state.normalization + "_" + displayMode;
}
function computeContactRecordsPercentile(contactRecords, p) {

    const counts = contactRecords.map(({ counts }) => counts)

    counts.sort((a, b) => a - b)

    const index = Math.floor((p / 100) * contactRecords.length);
    return counts[index];

}

function juiceboxMouseHandler({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY }) {

    if (undefined === ensembleManager || undefined === ensembleManager.locus) {
        return
    }

    const { genomicStart, genomicEnd } = ensembleManager.locus

    const trivialRejection = startXBP > genomicEnd || endXBP < genomicStart || startYBP > genomicEnd || endYBP < genomicStart

    if (trivialRejection) {
        return
    }

    const xRejection = xBP < genomicStart || xBP > genomicEnd
    const yRejection = yBP < genomicStart || yBP > genomicEnd

    if (xRejection || yRejection) {
        return
    }

    SpacewalkEventBus.globalBus.post({ type: 'DidUpdateGenomicInterpolant', data: { poster: this, interpolantList: [ interpolantX, interpolantY ] } })
}

export default JuiceboxPanel;
