import hic from '../../node_modules/juicebox.js/js/index.js'
import SpacewalkEventBus from '../spacewalkEventBus.js'
import Panel from '../panel.js'
import {
    ballAndStick,
    colorRampMaterialProvider,
    liveMapService,
    ensembleManager,
    ribbon,
    igvPanel
} from '../app.js'
import SWBDatasource from "../datasource/SWBDatasource.js"
import {makeDraggable} from "../utils/draggable.js"
import LiveMapState from "./liveMapState.js"
import LiveContactMapDataSet from "./liveContactMapDataSet.js"

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

        SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this)

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
        } catch (e) {
            const error = new Error(`Error initializing Juicebox ${ e.message }`)
            console.error(error.message)
            alert(error.message)

        }

        this.configureTabs()
        this.configureMouseHandlers()


        document.querySelector('#hic-live-contact-frequency-map-button').addEventListener('click', async e => {

            if (ensembleManager.datasource instanceof SWBDatasource) {
                await ensembleManager.datasource.calculateLiveMapVertexLists()
            }

            liveMapService.updateEnsembleContactFrequencyCanvas(undefined)
            this.present()

        })

    }

    receiveEvent({ type, data }) {

        if ('DidLoadEnsembleFile' === type) {
            const ctx = this.browser.contactMatrixView.ctx_live
            ctx.transferFromImageBitmap(null)

            // Create state and dataset
            this.browser.liveContactMapState = new LiveMapState(ensembleManager, this.browser.contactMatrixView)
            this.browser.liveContactMapDataSet = new LiveContactMapDataSet(igvPanel.browser.genome, ensembleManager)

            // Update Juicebox rulers
            this.browser.layoutController.xAxisRuler.presentLiveMapRuler(this.browser.liveContactMapState, this.browser.liveContactMapDataSet)
            this.browser.layoutController.yAxisRuler.presentLiveMapRuler(this.browser.liveContactMapState, this.browser.liveContactMapDataSet)

            if (!this.browser.contactMatrixView.mouseHandlersEnabled) {
                this.browser.contactMatrixView.addMouseHandlers(this.browser.contactMatrixView.$viewport);
                this.browser.contactMatrixView.mouseHandlersEnabled = true;
            }

        }

        super.receiveEvent({ type, data });

    }

    getClassName(){ return 'JuiceboxPanel' }

    async locusDidChange({ chr, genomicStart, genomicEnd }) {

        if (this.isContactMapLoaded() && this.browser.dataset.isLiveContactMapDataSet !== true) {
            try {
                await this.goto({ chr, start: genomicStart, end: genomicEnd })
            } catch (e) {
                console.error(e.message)
                alert(e.message)
            }
        }
    }

    configureTabs() {

        const tabAssessment = activeTabButton => {
            switch (activeTabButton.id) {
                case 'spacewalk-juicebox-panel-hic-map-tab':
                    document.getElementById('hic-live-distance-map-toggle-widget').style.display = 'none'
                    document.getElementById('hic-live-contact-frequency-map-threshold-widget').style.display = 'none'
                    document.getElementById('hic-file-chooser-dropdown').style.display = 'block'
                    this.browser.contactMatrixView.assessPanelTabSelection(false)
                    console.log('HIC Map Tab is active');
                    break;

                case 'spacewalk-juicebox-panel-live-map-tab':
                    document.getElementById('hic-live-distance-map-toggle-widget').style.display = 'none'
                    document.getElementById('hic-live-contact-frequency-map-threshold-widget').style.display = 'block'
                    document.getElementById('hic-file-chooser-dropdown').style.display = 'none'
                    this.browser.contactMatrixView.assessPanelTabSelection(true)
                    console.log('Live Map Tab is active');
                    break;

                case 'spacewalk-juicebox-panel-live-distance-map-tab':
                    document.getElementById('hic-live-distance-map-toggle-widget').style.display = 'block'
                    document.getElementById('hic-live-contact-frequency-map-threshold-widget').style.display = 'none'
                    document.getElementById('hic-file-chooser-dropdown').style.display = 'none'
                    this.browser.contactMatrixView.assessPanelTabSelection(true)
                    console.log('Live Distance Map Tab is active');
                    break;

                default:
                    console.log('Unknown tab is active');
                    break;
            }
        }

        const hicMapTabElement = document.getElementById('spacewalk-juicebox-panel-hic-map-tab')
        const liveMapTabElement = document.getElementById('spacewalk-juicebox-panel-live-map-tab')
        const liveDistanceMapTabElement = document.getElementById('spacewalk-juicebox-panel-live-distance-map-tab')

        // For each tab, assign data-bs-target to point to the corresponding map container (hi-c or live)
        hicMapTabElement.setAttribute("data-bs-target", `#${this.browser.id}-contact-map-canvas-container`)
        liveMapTabElement.setAttribute("data-bs-target", `#${this.browser.id}-live-contact-map-canvas-container`)
        liveDistanceMapTabElement.setAttribute("data-bs-target", `#${this.browser.id}-live-distance-map-canvas-container`)

        this.hicMapTab = new bootstrap.Tab(hicMapTabElement)
        this.liveMapTab = new bootstrap.Tab(liveMapTabElement)
        this.liveDistnceMapTab = new bootstrap.Tab(liveDistanceMapTabElement)

        const activeTabButton = this.container.querySelector('button.nav-link.active')
        tabAssessment(activeTabButton)

        this.browser.eventBus.subscribe('MapLoad', async event => {
            const activeTabButton = this.container.querySelector('button.nav-link.active')
            tabAssessment(activeTabButton)
        })

        for (const tabElement of this.container.querySelectorAll('button[data-bs-toggle="tab"]')) {
            tabElement.addEventListener('show.bs.tab', event => {
                tabAssessment(event.target)
                console.log(`Juicebox panel: ${ event.target.id } tab selection`)
            })
        }

        if (true === this.isContactMapLoaded()) {
            if (true === this.browser.dataset.isLiveContactMapDataSet) {
                this.liveMapTab.show()
            } else {
                this.hicMapTab.show()
            }
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
            const error = new Error(`Error loading ${ url }: ${ e }`)
            console.error(error.message)
            alert(error.message)
        }

        const { chr, genomicStart, genomicEnd } = ensembleManager.locus

        try {
            await this.browser.parseGotoInput(`${chr}:${genomicStart}-${genomicEnd}`)
        } catch (error) {
            console.warn(error.message)
        }

    }

    isContactMapLoaded() {

        if (undefined === this.browser) {
            return false
        } else if (undefined === this.browser.dataset) {
            return false
        } else {
            return true
        }
    }

    createContactRecordList(contactFrequencies, liveMapTraceLength) {
        this.browser.liveContactMapDataSet.createContactRecordList(contactFrequencies, liveMapTraceLength)
    }

    async renderWithLiveContactFrequencyData(contactFrequencies, contactFrequencyArray, liveMapTraceLength) {
        await this.browser.contactMatrixView.renderWithLiveContactFrequencyData(this.browser.liveContactMapState, this.browser.liveContactMapDataSet, contactFrequencies, contactFrequencyArray, liveMapTraceLength)
    }

    async colorPickerHandler(data) {
        if (liveMapService.liveContactMapDataSet) {
            console.log(`JuiceboxPanel - colorPicker(${ data }). renderWithLiveContactFrequencyData()`)
            await this.renderWithLiveContactFrequencyData(liveMapService.contactFrequencies, liveMapService.ensembleContactFrequencyArray, ensembleManager.getLiveMapTraceLength())
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
