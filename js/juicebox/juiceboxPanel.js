import hic from 'juicebox.js'
import AlertSingleton from '../widgets/alertSingleton.js'
import SpacewalkEventBus from '../spacewalkEventBus.js'
import Panel from '../panel.js'
import {ballAndStick, colorRampMaterialProvider, contactFrequencyMapPanel, ensembleManager, ribbon} from '../app.js'
import SWBDatasource from "../datasource/SWBDatasource"
import {makeDraggable} from "../utils/draggable"

class JuiceboxPanel extends Panel {

    constructor ({ container, panel, isHidden }) {

        const xFunction = (cw, w) => {
            return (cw - w)/2;
        };

        const yFunction = (ch, h) => {
            return ch - (h * 1.05);
        };

        super({ container, panel, isHidden, xFunction, yFunction });

        const dragHandle = panel.querySelector('.spacewalk_card_drag_container')
        makeDraggable(panel, dragHandle)

        this.$panel.on(`mouseenter.${ this.namespace }`, (event) => {
            event.stopPropagation();
            SpacewalkEventBus.globalBus.post({ type: 'DidEnterGenomicNavigator', data: 'DidEnterGenomicNavigator' });
        });

        this.$panel.on(`mouseleave.${ this.namespace }`, (event) => {
            event.stopPropagation();
            SpacewalkEventBus.globalBus.post({ type: 'DidLeaveGenomicNavigator', data: 'DidLeaveGenomicNavigator' });
        })

        SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this);
    }

    async initialize(container, config) {

        let session

        // juiceboxClassAdditions()

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
            this.browser = await hic.restoreSession(container, session)
            this.locus = config.locus
        } catch (error) {
            console.error(error.message)
            AlertSingleton.present(`Error initializing Juicebox ${ error.message }`)
        }

        this.configureMouseHandlers()

        hic.EventBus.globalBus.subscribe('MapLoad', event => {

            // hic-live-contact-frequency-map-threshold-widget
            const { dataset } = event.data
            const thresholdWidget = document.querySelector('#hic-live-contact-frequency-map-threshold-widget')
            thresholdWidget.style.display = undefined === dataset.isLiveContactMapDataSet ? 'none' : 'block'

            if (undefined === ensembleManager.locus) {
                const [ ab, c ] = config.locus.split('-')
                const [ a, b ] = ab.split(':')
                this.goto({ chr:a, start: parseInt(b), end: parseInt(c) })
            } else {
                const { chr, genomicStart, genomicEnd } = ensembleManager.locus
                this.goto({ chr, start: genomicStart, end: genomicEnd })
            }

        })

        document.querySelector('#hic-live-contact-frequency-map-button').addEventListener('click', async e => {

            if (ensembleManager.datasource instanceof SWBDatasource) {
                await ensembleManager.datasource.calculateLiveMapVertexLists()
            }

            contactFrequencyMapPanel.calculateContactFrequencies()
            this.present()

        })

    }

    receiveEvent({ type, data }) {

        if ('DidLoadEnsembleFile' === type) {
            const ctx = this.browser.contactMatrixView.ctx_live
            ctx.transferFromImageBitmap(null)
            // this.dismiss()
        }

        super.receiveEvent({ type, data });

    }

    getClassName(){ return 'JuiceboxPanel' }

    async locusDidChange({ chr, genomicStart, genomicEnd }) {

        if (this.isContactMapLoaded() && this.browser.dataset.isLiveContactMapDataSet !== true) {
            try {
                await this.goto({ chr, start: genomicStart, end: genomicEnd })
            } catch (e) {
                AlertSingleton.present(e.message)
            }
        }
    }

    configureMouseHandlers() {

        this.browser.eventBus.subscribe('DidHideCrosshairs', ribbon)
        this.browser.eventBus.subscribe('DidHideCrosshairs', ballAndStick)
        this.browser.eventBus.subscribe('DidHideCrosshairs', colorRampMaterialProvider)

        this.browser.setCustomCrosshairsHandler(({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY }) => {
            juiceboxMouseHandler({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY });
        })

    }

    async goto({ chr, start, end }) {

        if (this.isContactMapLoaded()) {
            try {
                const browser = this.browser
                await browser.parseGotoInput(`${chr}:${start}-${end}`)
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

                await this.browser.loadHicFile(config)

            }

        } catch (e) {
            console.error(e.message)
            AlertSingleton.present(`Error loading ${ url }: ${ e }`)
        }

        const { chr, genomicStart, genomicEnd } = ensembleManager.locus

        try {
            await this.browser.parseGotoInput(`${chr}:${genomicStart}-${genomicEnd}`)
        } catch (error) {
            console.warn(error.message)
        }

    }

    blurb() {
        return `${ this.browser.$contactMaplabel.text() }`
    }

    isContactMapLoaded() {
        return (this.browser && this.browser.dataset)
    }

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
