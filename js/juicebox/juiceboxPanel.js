import Globals from './../globals.js';
import * as hic from '../../node_modules/juicebox.js/js/hic.js';
import { makeDraggable } from "../draggable.js";
import { lerp } from '../math.js'
import { segmentIDForInterpolant, moveOffScreen, moveOnScreen } from "../utils.js";

class JuiceboxPanel {

    constructor ({ container, panel, isHidden }) {

        this.$panel = $(panel);
        this.container = container;
        this.isHidden = isHidden;

        if (isHidden) {
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

    }

    async receiveEvent({ type, data }) {

        if ("ToggleUIControl" === type && data && data.payload === this.$panel.attr('id')) {

            if (true === this.isHidden) {
                moveOnScreen(this);
                await this.browser.parseGotoInput(this.locus);
            } else {
                moveOffScreen(this);
            }

            this.isHidden = !this.isHidden;
        } else if ("DidLoadFile" === type) {

            const { chr, genomicStart, genomicEnd } = data;
            this.goto({ chr, start: genomicStart, end: genomicEnd });
        }
    }

    async initialize(browserConfig) {

        try {
            const { container, width, height } = browserConfig;
            this.browser = await hic.createBrowser(container, { width, height });
        } catch (error) {
            console.warn(error.message);
        }

        try {

            const hicConfig =
                {
                    url: "https://hicfiles.s3.amazonaws.com/hiseq/gm12878/in-situ/HIC010.hic",
                    name: "Rao and Huntley et al. | Cell 2014 GM12878 (human) in situ MboI HIC010 (47M)",
                    isControl: false
                };

            await this.browser.loadHicFile(hicConfig);

            $('#spacewalk_info_panel_juicebox').text(hicConfig.name);

        } catch (error) {
            console.warn(error.message);
        }

        this.locus = 'all';

        try {
            await this.browser.parseGotoInput(this.locus);
        } catch (error) {
            console.warn(error.message);
        }

        this.browser.setCustomCrosshairsHandler(({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY }) => {
            juiceboxMouseHandler({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY });
        });

    }

    async goto({ chr, start, end }) {

        this.locus = chr + ':' + start + '-' + end;

        try {
            await this.browser.parseGotoInput(this.locus);
        } catch (error) {
            console.warn(error.message);
        }

    }

    async loadURL({ url, name }){

        try {
            await this.browser.loadHicFile({ url, name, isControl: false });

            $('#spacewalk_info_panel_juicebox').text(name);

        } catch (error) {
            console.warn(error.message);
        }

        try {
            await this.browser.parseGotoInput(this.locus);
        } catch (error) {
            console.warn(error.message);
        }
    }

    async loadLocalFile({ file }){

        try {
            await this.browser.loadHicFile({ url: file, name: file.name, isControl: false });

            $('#spacewalk_info_panel_juicebox').text(file.name);

        } catch (error) {
            console.warn(error.message);
        }

        try {
            await this.browser.parseGotoInput(this.locus);
        } catch (error) {
            console.warn(error.message);
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
