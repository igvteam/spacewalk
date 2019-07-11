import Globals from './../globals.js';
import * as hic from '../../node_modules/juicebox.js/js/hic.js';
import HICBrowser from '../../node_modules/juicebox.js/js/hicBrowser.js';
import { makeDraggable } from "../draggable.js";
import { moveOffScreen, moveOnScreen } from "../utils.js";
import { guiManager } from "../gui.js";

class JuiceboxPanel {

    constructor ({ container, panel }) {

        this.$panel = $(panel);
        this.container = container;

        this.isHidden = guiManager.isPanelHidden(this.$panel.attr('id'));

        if (this.isHidden) {
            moveOffScreen(this);
        } else {
            this.layout();
        }

        makeDraggable(panel, $(panel).find('.spacewalk_card_drag_container').get(0));

        $(window).on('resize.trace3d.juicebox_panel', () => { this.onWindowResize(container, panel) });

        $(panel).on('mouseenter.trace3d.juicebox_panel', (event) => {
            event.stopPropagation();
            Globals.eventBus.post({ type: "DidEnterGUI" });
        });

        $(panel).on('mouseleave.trace3d.juicebox_panel', (event) => {
            event.stopPropagation();
            Globals.eventBus.post({ type: "DidLeaveGUI" });
        });

        Globals.eventBus.subscribe("ToggleUIControl", this);
        Globals.eventBus.subscribe('DidLoadFile', this);
        Globals.eventBus.subscribe('DidLoadPointCloudFile', this);
    }

    receiveEvent({ type, data }) {

        if ("ToggleUIControl" === type && data && data.payload === this.$panel.attr('id')) {

            (async () => {

                if (true === this.isHidden) {
                    moveOnScreen(this);
                } else {
                    moveOffScreen(this);
                }

                this.isHidden = !this.isHidden;
            })();

        } else if ("DidLoadFile" === type || "DidLoadPointCloudFile" === type) {

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

            // try {
            //
            //     const hicConfig =
            //         {
            //             url: "https://hicfiles.s3.amazonaws.com/hiseq/gm12878/in-situ/HIC010.hic",
            //             name: "Rao and Huntley et al. | Cell 2014 GM12878 (human) in situ MboI HIC010 (47M)",
            //             isControl: false
            //         };
            //
            //     await this.browser.loadHicFile(hicConfig);
            //
            //     $('#spacewalk_info_panel_juicebox').text(hicConfig.name);
            //
            // } catch (error) {
            //     console.warn(error.message);
            // }

            // try {
            //     await this.browser.parseGotoInput(this.locus);
            // } catch (error) {
            //     console.warn(error.message);
            // }

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

    load({ url, name, isControl }) {

        (async () => {

            try {
                await this.browser.loadHicFile({ url, name, isControl });
                $('#spacewalk_info_panel_juicebox').text(name);
            } catch (error) {
                console.warn(error.message);
            }

            this.presentPanel();

            if (this.isContactMapLoaded()) {
                await this.browser.parseGotoInput(this.locus);
            }

        })();

    }

    loadURL({ url, name }){
        this.load({ url, name, isControl: false });
    }

    loadLocalFile({ file }){
        this.load({ url: file, name: file.name, isControl: false });
    }

    isContactMapLoaded() {
        return (this.browser && this.browser.dataset);
    };

    presentPanel () {

        if (this.isHidden) {
            this.layout();
            guiManager.panelIsVisible(this.$panel.attr('id'));
            this.isHidden = false;
        }

    }

    onWindowResize() {
        if (false === this.isHidden) {
            this.layout();
        }
    }

    layout() {

        // const { left, top, right, bottom, x, y, width, height } = container.getBoundingClientRect();
        const { width: c_w, height: c_h } = this.container.getBoundingClientRect();
        const { width:   w, height:   h } = this.$panel.get(0).getBoundingClientRect();

        const left = (c_w - w)/2;
        const top = c_h - 1.05 * h;
        this.$panel.offset( { left, top } );
    }

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
