import hic from '../../node_modules/juicebox.js/js/index.js'
import SpacewalkEventBus from '../spacewalkEventBus.js'
import Panel from '../panel.js'
import {
    ballAndStick,
    colorRampMaterialProvider,
    liveContactMapService,
    liveDistanceMapService,
    ensembleManager,
    ribbon,
    igvPanel, juiceboxPanel
} from '../app.js'
import SWBDatasource from "../datasource/SWBDatasource.js"
import {makeDraggable} from "../utils/draggable.js"
import LiveMapState from "./liveMapState.js"
import LiveContactMapDataSet from "./liveContactMapDataSet.js"
import { renderLiveMapWithContactData } from "./liveContactMapService.js"
import { renderLiveMapWithDistanceData } from './liveDistanceMapService.js'

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

        panel.querySelector('#hic-live-contact-frequency-map-button').addEventListener('click', async e => {

            const { chr } = ensembleManager.locus
            const chromosome = igvPanel.browser.genome.getChromosome(chr.toLowerCase())

            if (chromosome) {
                if (ensembleManager.datasource instanceof SWBDatasource) {
                    await ensembleManager.datasource.calculateLiveMapVertexLists()
                }
                liveContactMapService.updateEnsembleContactFrequencyCanvas(undefined)
                this.present()
            } else {
                const str = `Can not create Live Contact Map. No valid genome for chromosome ${ chr }`
                console.warn(str)
                alert(str)
            }

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

        await this.loadSession(session)

    }

    async loadSession(session) {

        this.detachMouseHandlers()

        try {
            this.browser = await hic.restoreSession(document.querySelector('#spacewalk_juicebox_root_container'), session)
        } catch (e) {
            const error = new Error(`Error loading Juicebox Session ${ e.message }`)
            console.error(error.message)
            alert(error.message)
        }

        if (ensembleManager.datasource) {
            setJuiceboxLiveState(this.browser)
        }

        this.attachMouseHandlersAndEventSubscribers()

        this.hicMapTab.show()

    }

    attachMouseHandlersAndEventSubscribers() {

        this.browser.eventBus.subscribe('DidHideCrosshairs', ribbon)

        this.browser.eventBus.subscribe('DidHideCrosshairs', ballAndStick)

        this.browser.eventBus.subscribe('DidHideCrosshairs', colorRampMaterialProvider)

        this.browser.eventBus.subscribe('DidUpdateColor', async ({ data }) => {
            await this.colorPickerHandler(data)
        })

        this.browser.eventBus.subscribe('DidUpdateColorScaleThreshold', async ({ data }) => {
            const { threshold, r, g, b } = data
            console.log('JuiceboxPanel. Render Live Contact Map')
            await this.renderLiveMapWithContactData(liveContactMapService.contactFrequencies, liveContactMapService.rgbaMatrix, ensembleManager.getLiveMapTraceLength())

        })

        this.browser.eventBus.subscribe('MapLoad', async event => {
            const activeTabButton = this.container.querySelector('button.nav-link.active')
            tabAssessment(this.browser, activeTabButton)
        })

        this.browser.setCustomCrosshairsHandler(({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY }) => {
            juiceboxMouseHandler({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY });
        })

        this.configureTabs()
    }

    configureTabs() {

        // Locate tab elements
        const hicMapTabElement = document.getElementById('spacewalk-juicebox-panel-hic-map-tab')
        const liveMapTabElement = document.getElementById('spacewalk-juicebox-panel-live-map-tab')
        const liveDistanceMapTabElement = document.getElementById('spacewalk-juicebox-panel-live-distance-map-tab')

        // Assign data-bs-target to refer to corresponding map canvas container (hi-c or live-contact or live-distance)
        hicMapTabElement.setAttribute("data-bs-target", `#${this.browser.id}-contact-map-canvas-container`)
        liveMapTabElement.setAttribute("data-bs-target", `#${this.browser.id}-live-contact-map-canvas-container`)
        liveDistanceMapTabElement.setAttribute("data-bs-target", `#${this.browser.id}-live-distance-map-canvas-container`)

        // Create instance property for each tab
        this.hicMapTab = new bootstrap.Tab(hicMapTabElement)
        this.liveMapTab = new bootstrap.Tab(liveMapTabElement)
        this.liveDistnceMapTab = new bootstrap.Tab(liveDistanceMapTabElement)

        // Default to show Live Map tab
        this.liveMapTab.show()

        const activeTabButton = this.container.querySelector('button.nav-link.active')
        tabAssessment(this.browser, activeTabButton)

        for (const tabElement of this.container.querySelectorAll('button[data-bs-toggle="tab"]')) {
            tabElement.addEventListener('show.bs.tab', tabEventHandler)
        }

    }

    detachMouseHandlers() {

        for (const tabElement of this.container.querySelectorAll('button[data-bs-toggle="tab"]')) {
            tabElement.removeEventListener('show.bs.tab', tabEventHandler);
        }

    }

    receiveEvent({ type, data }) {

        if ('DidLoadEnsembleFile' === type) {

            setJuiceboxLiveState(this.browser)

            // Show Live Map tab to be consistent with Live State and Dataset
            this.liveMapTab.show()

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
        this.browser.liveMapDataset.createContactRecordList(this.browser.liveMapState, contactFrequencies, liveMapTraceLength)
    }

    async renderLiveMapWithContactData(contactFrequencies, contactFrequencyArray, liveMapTraceLength) {
        console.log('JuiceboxPanel. Render Live Contact Map')
        await renderLiveMapWithContactData(this.browser, this.browser.liveMapState, this.browser.liveMapDataset, contactFrequencies, contactFrequencyArray, liveMapTraceLength)
    }

    async renderLiveMapWithDistanceData(distances, maxDistance, rgbaMatrix, liveMapTraceLength) {
        console.log('JuiceboxPanel. Render Live Distance Map')
        await renderLiveMapWithDistanceData(this.browser, distances, maxDistance, rgbaMatrix, liveMapTraceLength)
    }

    async colorPickerHandler(data) {
        if (liveContactMapService.contactFrequencies) {
            console.log('JuiceboxPanel.colorPickerHandler(). Will render Live Contact Map')
            await this.renderLiveMapWithContactData(liveContactMapService.contactFrequencies, liveContactMapService.rgbaMatrix, ensembleManager.getLiveMapTraceLength())
        }
        if (liveDistanceMapService.distances) {
            console.log('JuiceboxPanel.colorPickerHandler(). Will render Live Distance Map')
            await this.renderLiveMapWithDistanceData(liveDistanceMapService.distances, liveDistanceMapService.maxDistance, liveDistanceMapService.rgbaMatrix, ensembleManager.getLiveMapTraceLength())
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

function isLiveMapSupported() {

    const { chr } = ensembleManager.locus
    const chromosome = igvPanel.browser.genome.getChromosome(chr.toLowerCase())
    if (undefined === chromosome) {
        console.warn(`Live Maps are not available for chromosome ${ chr }. No associated genome found`)
        return false
    } else {
        return true
    }
}

function setJuiceboxLiveState(browser) {

    if (true === isLiveMapSupported()){

        // Create state and dataset
        browser.liveMapState = new LiveMapState(ensembleManager, browser.contactMatrixView)
        browser.liveMapDataset = new LiveContactMapDataSet(igvPanel.browser.genome, ensembleManager)

        // Update Juicebox rulers
        browser.layoutController.xAxisRuler.presentLiveMapRuler(browser.liveMapState, browser.liveMapDataset)
        browser.layoutController.yAxisRuler.presentLiveMapRuler(browser.liveMapState, browser.liveMapDataset)

        if (!browser.contactMatrixView.mouseHandlersEnabled) {
            browser.contactMatrixView.addMouseHandlers(browser.contactMatrixView.$viewport);
            browser.contactMatrixView.mouseHandlersEnabled = true;
        }
    }

}

function tabEventHandler(event) {
    tabAssessment(juiceboxPanel.browser, event.target);
}

function tabAssessment(browser, activeTabButton) {

    console.log(`JuiceboxPanel. Tab ${ activeTabButton.id } is active`);

    switch (activeTabButton.id) {
        case 'spacewalk-juicebox-panel-hic-map-tab':
            document.getElementById('hic-live-distance-map-toggle-widget').style.display = 'none'
            document.getElementById('hic-live-contact-frequency-map-threshold-widget').style.display = 'none'
            document.getElementById('hic-file-chooser-dropdown').style.display = 'block'
            browser.contactMatrixView.assessTabSelection(false)
            break;

        case 'spacewalk-juicebox-panel-live-map-tab':
            document.getElementById('hic-live-distance-map-toggle-widget').style.display = 'none'
            document.getElementById('hic-live-contact-frequency-map-threshold-widget').style.display = 'block'
            document.getElementById('hic-file-chooser-dropdown').style.display = 'none'
            browser.contactMatrixView.assessTabSelection(true)
            break;

        case 'spacewalk-juicebox-panel-live-distance-map-tab':
            document.getElementById('hic-live-distance-map-toggle-widget').style.display = 'block'
            document.getElementById('hic-live-contact-frequency-map-threshold-widget').style.display = 'none'
            document.getElementById('hic-file-chooser-dropdown').style.display = 'none'
            browser.contactMatrixView.assessTabSelection(true)
            break;

        default:
            console.log('Unknown tab is active');
            break;
    }
}

export default JuiceboxPanel;
