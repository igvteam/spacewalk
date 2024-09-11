import hic from 'juicebox.js'
import AlertSingleton from '../widgets/alertSingleton.js'
import SpacewalkEventBus from '../spacewalkEventBus.js'
import Panel from '../panel.js'
import { ballAndStick, colorRampMaterialProvider, liveContactMapService, ensembleManager, ribbon } from '../app.js'
import SWBDatasource from "../datasource/SWBDatasource.js"
import {makeDraggable} from "../utils/draggable.js"

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

        this.configureTabs()
        this.configureMouseHandlers()

        this.browser.eventBus.subscribe('MapLoad', async event => {

            // hic-live-contact-frequency-map-threshold-widget
            // const { dataset } = event.data
            // const thresholdWidget = document.querySelector('#hic-live-contact-frequency-map-threshold-widget')
            // thresholdWidget.style.display = dataset === this.browser.liveContactMapDataSet ? 'block' : 'none'
            //
            // if (undefined === ensembleManager.locus) {
            //     const [ ab, c ] = config.locus.split('-')
            //     const [ a, b ] = ab.split(':')
            //     await this.goto({ chr:a, start: parseInt(b), end: parseInt(c) })
            // } else {
            //     const { chr, genomicStart, genomicEnd } = ensembleManager.locus
            //     await this.goto({ chr, start: genomicStart, end: genomicEnd })
            // }

            const activeTabButton = this.container.querySelector('button.nav-link.active')
            if ('spacewalk-juicebox-panel-hic-map-tab' === activeTabButton.id) {
                this.browser.contactMatrixView.assessPanelTabSelection(false)
            } else if ('spacewalk-juicebox-panel-live-map-tab' === activeTabButton.id) {
                this.browser.contactMatrixView.assessPanelTabSelection(true)
            }

        })

        document.querySelector('#hic-live-contact-frequency-map-button').addEventListener('click', async e => {

            if (ensembleManager.datasource instanceof SWBDatasource) {
                await ensembleManager.datasource.calculateLiveMapVertexLists()
            }

            liveContactMapService.updateEnsembleContactFrequencyCanvas(undefined)
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

    configureTabs() {

        this.browser.contactMatrixView.assessPanelTabSelection(false)

        document.getElementById('hic-live-contact-frequency-map-threshold-widget').style.display = 'none'
        document.getElementById('hic-file-chooser-dropdown').style.display = 'block'

        const hicMapTab = document.getElementById('spacewalk-juicebox-panel-hic-map-tab');
        const liveMapTab = document.getElementById('spacewalk-juicebox-panel-live-map-tab');

        // Assign data-bs-target to point to the respective tab content elements
        hicMapTab.setAttribute("data-bs-target", `#${this.browser.id}-contact-map-canvas-container`);
        liveMapTab.setAttribute("data-bs-target", `#${this.browser.id}-live-contact-map-canvas-container`);

        const tabs = this.container.querySelectorAll('button[data-bs-toggle="tab"]')

        for (const tab of tabs) {
            tab.addEventListener('show.bs.tab', event => {
                if (hicMapTab.id === event.target.id) {
                    document.getElementById('hic-live-contact-frequency-map-threshold-widget').style.display = 'none'
                    document.getElementById('hic-file-chooser-dropdown').style.display = 'block'
                    this.browser.contactMatrixView.assessPanelTabSelection(false)
                } else if (liveMapTab.id === event.target.id) {
                    document.getElementById('hic-live-contact-frequency-map-threshold-widget').style.display = 'block'
                    document.getElementById('hic-file-chooser-dropdown').style.display = 'none'
                    this.browser.contactMatrixView.assessPanelTabSelection(true)
                }
                console.log(`Juicebox panel: ${ event.target.id } tab selection`)
            })
        }

    }

    configureMouseHandlers() {

        this.browser.eventBus.subscribe('DidHideCrosshairs', ribbon)
        this.browser.eventBus.subscribe('DidHideCrosshairs', ballAndStick)
        this.browser.eventBus.subscribe('DidHideCrosshairs', colorRampMaterialProvider)

        this.browser.eventBus.subscribe('DidUpdateColor', async ({ data }) => {
            await this.colorPickerHandler(data)
        })

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

    isContactMapLoaded() {
        return (this.browser && this.browser.dataset)
    }

    async renderWithLiveContactFrequencyData(state, liveContactMapDataSet, contactFrequencies, contactFrequencyArray, liveMapTraceLength) {
        await this.browser.contactMatrixView.renderWithLiveContactFrequencyData(this.browser, state, liveContactMapDataSet, contactFrequencies, contactFrequencyArray, liveMapTraceLength)
    }

    async colorPickerHandler(data) {
        if (liveContactMapService.liveContactMapDataSet) {
            console.log(`JuiceboxPanel - colorPicker(${ data }). renderWithLiveContactFrequencyData()`)
            await this.renderWithLiveContactFrequencyData(liveContactMapService.hicState, liveContactMapService.liveContactMapDataSet, liveContactMapService.contactFrequencies, liveContactMapService.ensembleContactFrequencyArray, ensembleManager.getLiveMapTraceLength())
        }
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
