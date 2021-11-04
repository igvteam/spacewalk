import { EventBus, AlertSingleton } from 'igv-widgets'
import hic from './juicebox'
import Panel from './panel.js'
import { ensembleManager } from './app.js'
import {Globals} from './juicebox/globals.js';

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
    }

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
                console.error(`Juicebox assemply ${ Globals.currentBrowser.genome.id } differs from Ensemble assembly ${ genomeAssembly }`)
            }

            this.goto({ chr, start: genomicStart, end: genomicEnd })

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

        } catch (error) {
            console.warn(error.message)
            AlertSingleton.present(`Error initializing Juicebox ${ error.message }`)
        }

        if (Globals.currentBrowser) {
            this.configureMouseHandlers()
        }

    }

    configureMouseHandlers() {

        Globals.currentBrowser.eventBus.subscribe('DidHideCrosshairs', this)

        Globals.currentBrowser.contactMatrixView.$viewport.on(`mouseenter.${ this.namespace }`, (event) => {
            event.stopPropagation()
            EventBus.globalBus.post({ type: 'DidEnterGUI', data: this })
        })

        Globals.currentBrowser.contactMatrixView.$viewport.on(`mouseleave.${ this.namespace }`, (event) => {
            event.stopPropagation();
            EventBus.globalBus.post({ type: 'DidLeaveGUI', data: this })
        })

        Globals.currentBrowser.setCustomCrosshairsHandler(({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY }) => {
            juiceboxMouseHandler({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY });
        })

    }

    async goto({ chr, start, end }) {

        this.locus = chr + ':' + start + '-' + end;

        if (this.isContactMapLoaded()) {
            try {
                await Globals.currentBrowser.parseGotoInput(this.locus);
            } catch (error) {
                console.warn(error.message);
            }
        }

    }

    async selectLoad(path, name) {

        try {
            await Globals.currentBrowser.loadHicFile({ url: path, name, isControl: false });
            $('#spacewalk_info_panel_juicebox').text( this.blurb() );
        } catch (error) {
            console.warn(error.message);
        }

        this.present();

        try {
            await Globals.currentBrowser.parseGotoInput(this.locus);
        } catch (e) {
            console.warn(e.message);
        }

    }

    async loadHicFile(url, name, mapType) {

        try {
            const isControl = ('control-map' === mapType)

            const config = { url, name, isControl }

            if (isControl) {
                // do nothing
            } else {
                Globals.currentBrowser.reset()
                await Globals.currentBrowser.loadHicFile(config)
            }

            $('#spacewalk_info_panel_juicebox').text( this.blurb() )

        } catch (e) {
            AlertSingleton.present(`Error loading ${ url }: ${ e }`)
        }

        try {
            await Globals.currentBrowser.parseGotoInput(this.locus)
            this.present()
            EventBus.globalBus.post({ type: 'DidChangeGenome', data: { genomeID: Globals.currentBrowser.genome.id }})

        } catch (e) {
            console.warn(e.message)
            AlertSingleton.present(`Error navigating to locus ${ e.message }`)
        }

    }

    blurb() {
        return `${ Globals.currentBrowser.$contactMaplabel.text() }`
    }

    isContactMapLoaded() {
        return (Globals.currentBrowser && Globals.currentBrowser.dataset);
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

    EventBus.globalBus.post({ type: 'DidUpdateGenomicInterpolant', data: { poster: this, interpolantList: [ interpolantX, interpolantY ] } })
}

export default JuiceboxPanel;
