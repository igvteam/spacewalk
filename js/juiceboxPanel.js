import { AlertSingleton } from 'igv-widgets'
import hic from './juicebox/index.js'
import SpacewalkEventBus from './spacewalkEventBus.js'
import Panel from './panel.js'
import { ensembleManager } from './app.js'
import {Globals} from './juicebox/globals.js';
import { hideGlobalSpinner, showGlobalSpinner } from './utils.js'
import HICEvent from "./juicebox/hicEvent.js"
import {createBrowser} from "./juicebox/hicBrowserLifecycle"

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

        SpacewalkEventBus.globalBus.subscribe('DidLoadEnsembleFile', this);
    }

    getClassName(){ return 'JuiceboxPanel' }

    receiveEvent({ type, data }) {

        super.receiveEvent({ type, data });

        if ('DidLoadEnsembleFile' === type) {

            const { genomeAssembly, chr, genomicStart, genomicEnd } = data

            console.log(`JuiceboxPanel - DidLoadEnsembleFile - genome id ${ genomeAssembly }`)

            // if (Globals.currentBrowser.genome && genomeAssembly !== Globals.currentBrowser.genome.id) {
            //     Globals.currentBrowser.reset()
            // } else {
            //     this.goto({ chr, start: genomicStart, end: genomicEnd })
            // }

            if (Globals.currentBrowser.genome && genomeAssembly !== Globals.currentBrowser.genome.id) {
                console.warn(`Juicebox assemply ${ Globals.currentBrowser.genome.id } differs from Ensemble assembly ${ genomeAssembly }`)
            }

            if (this.isContactMapLoaded() && Globals.currentBrowser.dataset.isLiveContactMapDataSet !== true) {
                this.goto({ chr, start: genomicStart, end: genomicEnd })
            }


        } else if ('DidHideCrosshairs' === type) {
            SpacewalkEventBus.globalBus.post({ type: 'DidLeaveGUI', data: 'DidLeaveGUI' });
        }
    }

    async initialize(container, config) {


        let session

        if (config.browsers) {
            session = Object.assign({ queryParametersSupported: false }, config)
        } else {
            const { locus, width, height } = config
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

        this.locus = config.locus

        try {

            await createBrowser(container, session)

        } catch (error) {
            console.warn(error.message)
            AlertSingleton.present(`Error initializing Juicebox ${ error.message }`)
        }

        if (Globals.currentBrowser) {
            this.configureMouseHandlers()
        }

        Globals.currentBrowser.update()

    }

    configureMouseHandlers() {

        Globals.currentBrowser.eventBus.subscribe('DidHideCrosshairs', this)

        Globals.currentBrowser.contactMatrixView.$viewport.on(`mouseenter.${ this.namespace }`, (event) => {
            event.stopPropagation()
            SpacewalkEventBus.globalBus.post({ type: 'DidEnterGUI', data: this })
        })

        Globals.currentBrowser.contactMatrixView.$viewport.on(`mouseleave.${ this.namespace }`, (event) => {
            event.stopPropagation();
            SpacewalkEventBus.globalBus.post({ type: 'DidLeaveGUI', data: this })
        })

        Globals.currentBrowser.setCustomCrosshairsHandler(({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY }) => {
            juiceboxMouseHandler({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY });
        })

    }

    async goto({ chr, start, end }) {

        if (this.isContactMapLoaded()) {
            try {
                await Globals.currentBrowser.parseLocusString(`${chr}:${start}-${end}`, true)
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

                await Globals.currentBrowser.loadHicFile(config)

                if (ensembleManager.locus) {

                    const { chr, genomicStart, genomicEnd } = ensembleManager.locus
                    await Globals.currentBrowser.parseLocusString(`${chr}:${genomicStart}-${genomicEnd}`, true)

                } else {

                    const eventConfig =
                        {
                            state: Globals.currentBrowser.state,
                            resolutionChanged: true,
                            chrChanged: true
                        }

                    await Globals.currentBrowser.update(HICEvent('LocusChange', eventConfig))
                }


            }

            $('#spacewalk_info_panel_juicebox').text( this.blurb() )

        } catch (e) {
            console.error(e.message)
            AlertSingleton.present(`Error loading ${ url }: ${ e }`)
        }

    }

    blurb() {
        return `${ Globals.currentBrowser.$contactMaplabel.text() }`
    }

    isContactMapLoaded() {
        return (Globals.currentBrowser && Globals.currentBrowser.dataset)
    }

    toJSON() {
        return Globals.currentBrowser.toJSON()
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
