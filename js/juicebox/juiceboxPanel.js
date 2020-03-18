import { StringUtils } from '../../node_modules/igv-utils/src/index.js'
import hic from '../../node_modules/juicebox.js/dist/juicebox.esm.js';
import ModalTable from '../../node_modules/data-modal/js/modalTable.js';

import Panel from "../panel.js";
import { ensembleManager, eventBus } from "../app.js";

let contactMapDatasource = undefined;

const contactMapSelectHandler = selectionList => {
    const { url, name } = contactMapDatasource.tableSelectionHandler(selectionList);
    loadHicFile(url, name);
};

const contactMapModal = new ModalTable({ id: 'spacewalk-contact-map-modal', title: 'Contact Map', selectHandler:contactMapSelectHandler, pageLength: 100 });

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

        } else if ('DidHideCrosshairs') {
            eventBus.post({ type: 'DidLeaveGUI', data: 'DidLeaveGUI' });

        }
    }

    async initialize({ container, width, height }) {

        this.locus = 'all';

        try {
            await hic.initApp(container, { width, height, queryParametersSupported: false });
            this.browser = hic.HICBrowser.getCurrentBrowser()
        } catch (error) {
            console.warn(error.message);
        }

        // const $kids = $('.hic-navbar-container').children('div');
        // $kids.eq(1).hide(); // control label container
        // $kids.eq(2).hide(); // lower widget container

        this.browser.eventBus.subscribe("DidHideCrosshairs", this);

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

export let juiceboxSelectLoader = async ($selectModal, onChangeConfiguration) => {

    const data = await hic.igv.xhr.loadString('https://aidenlab.org/juicebox/res/mapMenuData.txt');
    const lines = StringUtils.splitLines(data);

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
