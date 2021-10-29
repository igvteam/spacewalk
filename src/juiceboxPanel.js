import { EventBus, AlertSingleton } from 'igv-widgets'
import { StringUtils } from 'igv-utils'
import hic from './juicebox'
import Panel from './panel.js'
import { ensembleManager } from './app.js'

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
            EventBus.globalBus.post({ type: 'DidEnterGenomicNavigator', data: 'DidEnterGenomicNavigator' });
        });

        this.$panel.on(`mouseleave.${ this.namespace }.noodle-ribbon-render`, (event) => {
            event.stopPropagation();
            EventBus.globalBus.post({ type: 'DidLeaveGenomicNavigator', data: 'DidLeaveGenomicNavigator' });
        });

        EventBus.globalBus.subscribe('DidLoadEnsembleFile', this);
        EventBus.globalBus.subscribe('DidChangeGenome', this)
    }

    receiveEvent({ type, data }) {

        super.receiveEvent({ type, data });

        if ("DidChangeGenome" === type) {
            console.log(`JuiceboxPanel - DidChangeGenome - genome id ${ data.genomeID }`)
        } else if ('DidLoadEnsembleFile' === type) {

            const { genomeAssembly, chr, genomicStart, genomicEnd } = data

            console.log(`JuiceboxPanel - DidLoadEnsembleFile - genome id ${ genomeAssembly }`)

            if (this.browser.genome && genomeAssembly !== this.browser.genome.id) {
                this.browser.reset()
            } else {
                this.goto({ chr, start: genomicStart, end: genomicEnd })
            }

        } else if ('DidHideCrosshairs' === type) {
            EventBus.globalBus.post({ type: 'DidLeaveGUI', data: 'DidLeaveGUI' });
        }
    }

    async initialize({ container, width, height, session }) {

        try {

            if (session) {
                if ('{}' === session.browsers[ 0 ]) {
                    this.locus = 'all';
                    await hic.init(container, { width, height, queryParametersSupported: false })
                } else {
                    await hic.restoreSession(container, session)
                }

            } else {
                this.locus = 'all';
                await hic.init(container, { width, height, queryParametersSupported: false })
            }

            this.browser = hic.getCurrentBrowser()

        } catch (error) {
            console.warn(error.message)
            AlertSingleton.present(`Error initializing Juicebox ${ error.message }`)
        }

        if (this.browser) {
            this.configureMouseHandlers()
        }

    }

    configureMouseHandlers() {

        this.browser.eventBus.subscribe('DidHideCrosshairs', this)

        this.browser.contactMatrixView.$viewport.on(`mouseenter.${ this.namespace }`, (event) => {
            event.stopPropagation()
            EventBus.globalBus.post({ type: 'DidEnterGUI', data: this })
        })

        this.browser.contactMatrixView.$viewport.on(`mouseleave.${ this.namespace }`, (event) => {
            event.stopPropagation();
            EventBus.globalBus.post({ type: 'DidLeaveGUI', data: this })
        })

        this.browser.setCustomCrosshairsHandler(({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY }) => {
            juiceboxMouseHandler({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY });
        })

    }

    async goto({ chr, start, end }) {

        this.locus = chr + ':' + start + '-' + end;

        if (this.isContactMapLoaded()) {
            try {
                await this.browser.parseGotoInput(this.locus);
            } catch (error) {
                console.warn(error.message);
            }
        }

    }

    async selectLoad(path, name) {

        try {
            await this.browser.loadHicFile({ url: path, name, isControl: false });
            $('#spacewalk_info_panel_juicebox').text( this.blurb() );
        } catch (error) {
            console.warn(error.message);
        }

        this.present();

        try {
            await this.browser.parseGotoInput(this.locus);
        } catch (e) {
            console.warn(e.message);
        }

    }

    async loadHicFile(url, name, mapType) {

        const browser = hic.getCurrentBrowser()
        try {
            const isControl = ('control-map' === mapType)

            const config = { url, name, isControl }

            if (isControl) {
                // do nothing
            } else {
                browser.reset()
                await browser.loadHicFile(config)
            }

            $('#spacewalk_info_panel_juicebox').text( this.blurb() )

        } catch (e) {
            AlertSingleton.present(`Error loading ${ url }: ${ e }`)
        }

        try {
            await browser.parseGotoInput(this.locus)
            this.present()
            EventBus.globalBus.post({ type: 'DidChangeGenome', data: { genomeID: browser.genome.id }})

        } catch (e) {
            console.warn(e.message)
            AlertSingleton.present(`Error navigating to locus ${ e.message }`)
        }

    }

    blurb() {
        return `${ this.browser.$contactMaplabel.text() }`
    }

    isContactMapLoaded() {
        return (this.browser && this.browser.dataset);
    }

    toJSON() {
        return this.browser.toJSON()
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

    EventBus.globalBus.post({ type: 'DidUpdateGenomicInterpolant', data: { poster: this, interpolantList: [ interpolantX, interpolantY ] } })
}

export default JuiceboxPanel;
