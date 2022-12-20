import hic from 'juicebox.js'
import { AlertSingleton } from 'igv-widgets'
import SpacewalkEventBus from './spacewalkEventBus.js'
import Panel from './panel.js'
import {ensembleManager} from './app.js'
import HICEvent from './hicEvent.js'

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
            this.configureMouseHandlers()
        }

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
                await hic.getCurrentBrowser().parseLocusString(`${chr}:${start}-${end}`, true)
            } catch (error) {
                console.warn(error.message);
            }
        }

    }

    async loadHicFile(url, name, mapType) {

        try {
            const isControl = ('control-map' === mapType)

            const config = { url, name, isControl }

            if (isControl) {
                // do nothing
            } else {
                this.present()

                await hic.getCurrentBrowser().loadHicFile(config)

                if (ensembleManager.genome) {

                    const { chr, genomicStart, genomicEnd } = ensembleManager.genome.locus
                    await hic.getCurrentBrowser().parseLocusString(`${chr}:${genomicStart}-${genomicEnd}`, true)

                } else {

                    const eventConfig =
                        {
                            state: hic.getCurrentBrowser().state,
                            resolutionChanged: true,
                            chrChanged: true
                        }

                    await hic.getCurrentBrowser().update(HICEvent('LocusChange', eventConfig))
                }


            }

            $('#spacewalk_info_panel_juicebox').text( this.blurb() )

        } catch (e) {
            console.error(e.message)
            AlertSingleton.present(`Error loading ${ url }: ${ e }`)
        }

    }

    blurb() {
        return `${ hic.getCurrentBrowser().$contactMaplabel.text() }`
    }

    isContactMapLoaded() {
        return (hic.getCurrentBrowser() && hic.getCurrentBrowser().dataset)
    }

}

function juiceboxMouseHandler({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY }) {

    if (undefined === ensembleManager || undefined === ensembleManager.genome.locus) {
        return
    }

    const { genomicStart, genomicEnd } = ensembleManager.genome.locus

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
