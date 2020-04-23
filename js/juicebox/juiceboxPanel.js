import hic from '../../node_modules/juicebox.js/dist/juicebox.esm.js';
import Panel from "../panel.js";
import ContactMapLoad from "./contactMapLoad.js";
import { googleEnabled, ensembleManager, eventBus } from "../app.js";
import { spacewalkConfig } from "../../spacewalk-config.js";

let contactMapLoad;

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
            eventBus.post({ type: 'DidEnterGenomicNavigator', data: 'DidEnterGenomicNavigator' });
        });

        this.$panel.on(`mouseleave.${ this.namespace }.noodle-ribbon-render`, (event) => {
            event.stopPropagation();
            eventBus.post({ type: 'DidLeaveGenomicNavigator', data: 'DidLeaveGenomicNavigator' });
        });

        eventBus.subscribe('DidLoadEnsembleFile', this);

    }

    receiveEvent({ type, data }) {

        super.receiveEvent({ type, data });

        if ('DidLoadEnsembleFile' === type) {

            const { chr, genomicStart, genomicEnd } = data;
            this.goto({ chr, start: genomicStart, end: genomicEnd });

        } else if ('DidHideCrosshairs' === type) {
            eventBus.post({ type: 'DidLeaveGUI', data: 'DidLeaveGUI' });
        }
    }

    async initialize({ container, width, height, session }) {


        try {

            if (session) {
                await hic.initApp(container, { session, width, height, queryParametersSupported: false });
            } else {
                this.locus = 'all';
                await hic.initApp(container, { width, height, queryParametersSupported: false });
            }

            this.browser = hic.HICBrowser.currentBrowser;

        } catch (error) {
            console.warn(error.message);
        }

        this.browser.eventBus.subscribe('DidHideCrosshairs', this);

        this.browser.contactMatrixView.$viewport.on(`mouseenter.${ this.namespace }.noodle-ribbon-render`, (event) => {
            event.stopPropagation();
            eventBus.post({ type: 'DidEnterGUI', data: this });
        });

        this.browser.contactMatrixView.$viewport.on(`mouseleave.${ this.namespace }.noodle-ribbon-render`, (event) => {
            event.stopPropagation();
            eventBus.post({ type: 'DidLeaveGUI', data: this });
        });

        this.browser.setCustomCrosshairsHandler(({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY }) => {
            juiceboxMouseHandler({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY });
        });

        const $dropdownButton = $('#spacewalk-juicebox-load-dropdown-button');
        const $dropdowns = $dropdownButton.parent();

        const contactMapLoadConfig =
            {
                rootContainer: document.querySelector('#spacewalk-main'),
                $dropdowns,
                $localFileInputs: $('#spacewalk-juicebox-load-local-input'),
                urlLoadModalId: 'spacewalk-juicebox-url-modal',
                dataModalId: 'spacewalk-contact-map-modal',
                $dropboxButtons: $('#spacewalk-juicebox-contact-map-dropdown-dropbox-button'),
                $googleDriveButtons: $('#spacewalk-juicebox-contact-map-dropdown-google-drive-button'),
                googleEnabled,
                contactMapMenu: spacewalkConfig.contactMapMenu,
                loadHandler: async (path, name, mapType) => {
                    await this.load(path)
                }
            };

        contactMapLoad = new ContactMapLoad(contactMapLoadConfig);

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

    async load(path) {

        const name = hic.igv.isFilePath(path) ? path.name : undefined;

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

    blurb() {

        // console.log('WARNING: JuiceboxPanel currently disabled. Method blurb() is disabled.');
        // return;

        return `${ this.browser.$contactMaplabel.text() }`;
    }

    isContactMapLoaded() {
        return (this.browser && this.browser.dataset);
    };

}

const juiceboxMouseHandler = ({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY }) => {

    if (undefined === ensembleManager || undefined === ensembleManager.locus) {
        return;
    }

    const { genomicStart, genomicEnd } = ensembleManager.locus;

    const trivialRejection = startXBP > genomicEnd || endXBP < genomicStart || startYBP > genomicEnd || endYBP < genomicStart;

    if (trivialRejection) {
        return;
    }

    const xRejection = xBP < genomicStart || xBP > genomicEnd;
    const yRejection = yBP < genomicStart || yBP > genomicEnd;

    if (xRejection || yRejection) {
        return;
    }

    eventBus.post({ type: 'DidSelectSegmentID', data: { interpolantList: [ interpolantX, interpolantY ] } });
};

export default JuiceboxPanel;
