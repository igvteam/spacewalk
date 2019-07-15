import Globals from './../globals.js';
import * as hic from '../../node_modules/juicebox.js/js/hic.js';
import { guiManager } from "../gui.js";
import Panel from "../panel.js";

class JuiceboxPanel extends Panel {

    constructor ({ container, panel }) {

        const isHidden = guiManager.isPanelHidden($(panel).attr('id'));

        const xFunction = (cw, w) => {
            return (cw - w)/2;
        };

        const yFunction = (ch, h) => {
            return ch - (h * 1.05);
        };

        super({ container, panel, isHidden, xFunction, yFunction });

        this.$panel.on('click.juicebox_panel', event => {
            Globals.eventBus.post({ type: "DidSelectPanel", data: this.$panel });
        });

        Globals.eventBus.subscribe('DidLoadFile', this);
        Globals.eventBus.subscribe('DidLoadPointCloudFile', this);
    }

    receiveEvent({ type, data }) {

        super.receiveEvent({ type, data });

        if ("DidLoadFile" === type || "DidLoadPointCloudFile" === type) {

            const { chr, genomicStart, genomicEnd } = data;
            this.goto({ chr, start: genomicStart, end: genomicEnd });

        }
    }

    initialize(browserConfig) {

        this.locus = 'all';

        (async () => {

            try {
                const { container, width, height } = browserConfig;
                this.browser = await hic.createBrowser(container, { width, height });
            } catch (error) {
                console.warn(error.message);
            }

            this.browser.setCustomCrosshairsHandler(({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY }) => {
                juiceboxMouseHandler({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY });
            });

        })();

    }

    goto({ chr, start, end }) {

        this.locus = chr + ':' + start + '-' + end;

        if (this.isContactMapLoaded()) {
            (async () => {

                try {
                    await this.browser.parseGotoInput(this.locus);
                } catch (error) {
                    console.warn(error.message);
                }

            })();
        }

    }

    loadPath({ url, name, isControl }) {

        (async () => {

            try {
                await this.browser.loadHicFile({ url, name, isControl });
                $('#spacewalk_info_panel_juicebox').text(name);
            } catch (error) {
                console.warn(error.message);
            }

            this.presentPanel();

            try {
                await this.browser.parseGotoInput(this.locus);
            } catch (e) {
                console.warn(e.message);
            }

        })();

    }

    loadURL({ url, name }){
        this.loadPath({ url, name, isControl: false });
    }

    loadLocalFile({ file }){
        this.loadPath({ url: file, name: file.name, isControl: false });
    }

    isContactMapLoaded() {
        return (this.browser && this.browser.dataset);
    };

}

const juiceboxMouseHandler = ({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY }) => {

    if (undefined === Globals.ensembleManager || undefined === Globals.ensembleManager.locus) {
        return;
    }

    const { genomicStart, genomicEnd } = Globals.ensembleManager.locus;

    const trivialRejection = startXBP > genomicEnd || endXBP < genomicStart || startYBP > genomicEnd || endYBP < genomicStart;

    if (trivialRejection) {
        return;
    }

    const xRejection = xBP < genomicStart || xBP > genomicEnd;
    const yRejection = yBP < genomicStart || yBP > genomicEnd;

    if (xRejection || yRejection) {
        return;
    }

    const segmentIDX = Globals.ensembleManager.segmentIDForGenomicLocation(xBP);
    const segmentIDY = Globals.ensembleManager.segmentIDForGenomicLocation(yBP);
    const segmentIDList = segmentIDX === segmentIDY ? [ segmentIDX ] : [ segmentIDX, segmentIDY ];

    Globals.eventBus.post({ type: 'DidSelectSegmentID', data: { interpolantList: [ interpolantX, interpolantY ], segmentIDList } });
};

export let juiceboxSelectLoader = async ($select) => {

    const data = await igv.xhr.loadString('resources/hicFiles.txt');
    const lines = igv.splitLines(data);

    for (let line of lines) {

        const tokens = line.split('\t');

        if (tokens.length > 1) {
            const $option = $('<option value="' + tokens[0] + '">' + tokens[1] + '</option>');
            $select.append($option);
        }

    }

};

export default JuiceboxPanel;
