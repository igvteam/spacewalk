import hic from '../../node_modules/juicebox.js/dist/juicebox.esm.js';
import Panel from "../panel.js";
import { ensembleManager, eventBus } from "../app.js";
import {getUrlParams} from "../session.js";

class JuiceboxPanel extends Panel {

    constructor ({ container, panel, isHidden }) {

        const xFunction = (cw, w) => {
            return (cw - w)/2;
        };

        const yFunction = (ch, h) => {
            return ch - (h * 1.05);
        };

        super({ container, panel, isHidden, xFunction, yFunction });

        eventBus.subscribe('DidLoadEnsembleFile', this);
    }

    receiveEvent({ type, data }) {

        super.receiveEvent({ type, data });

        if ("DidLoadEnsembleFile" === type) {

            const { chr, genomicStart, genomicEnd } = data;
            this.goto({ chr, start: genomicStart, end: genomicEnd });

        }
    }

    async initialize(browserConfig) {

        this.locus = 'all';

        try {
            const { container, width, height } = browserConfig;

            const params = getUrlParams(window.location.href);

            let queryString = undefined;
            if (params.hasOwnProperty('juiceboxData')) {

                const { juiceboxData } = params;

                let decompressed = hic.decompressQueryParameter(juiceboxData);

                decompressed = decompressed.substr(1, decompressed.length - 2);  // Strip leading and trailing bracket
                const parts = decompressed.split("},{");
                queryString = decodeURIComponent( parts[ 0 ] );
            }

            const config = queryString ? { queryString, width, height } : { width, height };

            this.browser = await hic.createBrowser(container, config);

        } catch (error) {
            console.warn(error.message);
        }

        this.browser.setCustomCrosshairsHandler(({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY }) => {
            juiceboxMouseHandler({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY });
        });


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

    async loadPath({ url, name, isControl }) {

        try {
            await this.browser.loadHicFile({ url, name, isControl });
            $('#spacewalk_info_panel_juicebox').text( this.blurb() );
        } catch (error) {
            console.warn(error.message);
        }

        this.presentPanel();

        try {
            await this.browser.parseGotoInput(this.locus);
        } catch (e) {
            console.warn(e.message);
        }

    }

    async loadURL({ url, name }){
        await this.loadPath({ url, name, isControl: false });
    }

    async loadLocalFile({ file }){
        await this.loadPath({ url: file, name: file.name, isControl: false });
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

export let juiceboxSelectLoader = async ($selectModal, onChangeConfiguration) => {

    const data = await hic.igv.xhr.loadString('resources/hicFiles.txt');
    const lines = hic.igv.splitLines(data);

    const $select = $selectModal.find('select');

    for (let line of lines) {

        const tokens = line.split('\t');

        if (tokens.length > 1) {
            const $option = $('<option value="' + tokens[0] + '">' + tokens[1] + '</option>');
            $select.append($option);
        }

    }

    onChangeConfiguration();

};

export default JuiceboxPanel;
