import { globalEventBus } from "./eventBus.js";
import { segmentIndexForInterpolant } from './colorRampWidget.js';
import { makeDraggable } from "./draggable.js";
import { sceneManager, structureManager } from "./main.js";
import { lerp } from './math.js'
import { numberFormatter, moveOffScreen, moveOnScreen } from "./utils.js";

let currentURL = undefined;
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

        makeDraggable(panel, $(panel).find('.trace3d_card_drag_container').get(0));

        $(window).on('resize.trace3d.juicebox_panel', () => { this.onWindowResize(container, panel) });

        $(panel).on('mouseenter.trace3d.juicebox_panel', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidEnterGUI" });
        });

        $(panel).on('mouseleave.trace3d.juicebox_panel', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidLeaveGUI" });
        });

        // URL
        const $url_input = $('#trace3d_juicebox_panel_url_input');
        $url_input.val('');

        const $url_button = $('#trace3d_juicebox_panel_url_button');

        $url_input.on('change.trace3d_juicebox_panel_url_input', (event) => {
            event.stopPropagation();
            currentURL = event.target.value;
        });

        const $spinner_container = $('#trace3d_hic_url_form_group');

        $url_button.on('click.trace3d_juicebox_panel_url_button', async (event) => {

            event.stopPropagation();

            $url_input.trigger('change.trace3d_juicebox_panel_url_input');
            await this.loadURL({ url: currentURL, $spinner: $spinner_container.find('.spinner-border')});
            $url_input.val('');
            currentURL = undefined;

        });

        globalEventBus.subscribe("ToggleUIControl", this);

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
        }
    }

    async createBrowser (config) {

        const urlShortenerConfig =
            [
                {
                    provider: "bitly",
                    apiKey: "ABCD",        // TODO -- replace with your Bitly access token
                    hostname: 'bit.ly'
                },
                {
                    provider: "google",
                    apiKey: "ABCD",        // TODO -- replace with your Google API Key
                    hostname: "goo.gl"
                }
            ];

        hic.setURLShortener(urlShortenerConfig);

        try {
            const browser = await hic.createBrowser(config.container, config);

            if (false === this.isHidden) {
                this.layout();
            }

            this.browser = browser;

            return browser;
        } catch (error) {
            console.warn(error.message);
            return undefined;
        }
    }

    async goto({ chr, start, end }) {
        this.locus = chr + ':' + start + '-' + end;
        await this.browser.parseGotoInput(this.locus);
    }

    async defaultConfiguration () {

        const config =
            {
                url: "https://hicfiles.s3.amazonaws.com/hiseq/gm12878/in-situ/HIC010.hic",
                name: "Rao and Huntley et al. | Cell 2014 GM12878 (human) in situ MboI HIC010 (47M)",
                isControl: false
            };

        await this.browser.loadHicFile(config);
        await this.goto({ chr:'chr21', start:28e6, end:30e6 });
    }

    async loadURL({ url, $spinner }){

        url = url || '';

        if ('' !== url) {
            $spinner.show();

            await this.browser.loadHicFile({ url });
            await this.browser.parseGotoInput(this.locus);
            $spinner.hide();
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

export let juiceboxMouseHandler = ({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY, structureLength }) => {

    const { genomicStart, genomicEnd } = structureManager.locus;

    const trivialRejection = startXBP > genomicEnd || endXBP < genomicStart || startYBP > genomicEnd || endYBP < genomicStart;

    if (trivialRejection) {
        return;
    }

    const xRejection = xBP < genomicStart || xBP > genomicEnd;
    const yRejection = yBP < genomicStart || yBP > genomicEnd;

    if (xRejection || yRejection) {
        return;
    }

    let a;
    let b;

    [ a, b ] = [ (startXBP - genomicStart)/(genomicEnd - genomicStart), (endXBP - genomicStart)/(genomicEnd - genomicStart) ];
    const segmentIndexX = segmentIndexForInterpolant(lerp(a, b, interpolantX), structureLength);

    [ a, b ] = [ (startYBP - genomicStart)/(genomicEnd - genomicStart), (endYBP - genomicStart)/(genomicEnd - genomicStart) ];
    const segmentIndexY = segmentIndexForInterpolant(lerp(a, b, interpolantY), structureLength);

    if (segmentIndexX === segmentIndexY) {
        sceneManager.colorRampPanel.colorRampWidget.highlight([ segmentIndexX ]);
        globalEventBus.post({ type: 'DidSelectSegmentIndex', data: [ segmentIndexX ] });
    } else {
        sceneManager.colorRampPanel.colorRampWidget.highlight([ segmentIndexX, segmentIndexY ]);
        globalEventBus.post({ type: 'DidSelectSegmentIndex', data: [ segmentIndexX, segmentIndexY ] });
    }


};

export default JuiceboxPanel;
