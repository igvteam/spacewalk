import { globalEventBus } from "./eventBus.js";
import { segmentIndexForInterpolant } from './colorRampWidget.js';
import { makeDraggable } from "./draggable.js";
import { sceneManager, structureManager } from "./main.js";
import { numberFormatter } from './utils.js'
import { lerp } from './math.js'

let currentURL = undefined;

class JuiceboxPanel {

    constructor ({ container, panel }) {

        this.$panel = $(panel);
        this.container = container;

        layout(container, panel);

        makeDraggable(panel, $(panel).find('.trace3d_card_drag_container').get(0));

        $(window).on('resize.trace3d.juicebox_panel', () => { this.onWindowResize(container, panel) });

        $(panel).on('mouseenter.trace3d.juicebox_panel', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidEnterGUI" });
        });

        $(panel).on('mouseleave.trace3d.juicebox_panel', (event) => {
            event.stopPropagation();

            if (sceneManager) {
                sceneManager.colorRampPanel.colorRampWidget.repaint();
            }

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

        const { payload } = data;

        if ("ToggleUIControl" === type && this.$panel.attr('id') === payload) {

            this.$panel.toggle();

            if (this.$panel.is(":visible")) {
                layout(this.container, this.$panel.get(0));
                await this.browser.parseGotoInput(this.locus);
            }

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

            layout(this.container, this.$panel.get(0));

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

    };

    onWindowResize(container, panel) {
        layout(container, panel);
    };

}

let layout = (container, element) => {

    // const { left, top, right, bottom, x, y, width, height } = container.getBoundingClientRect();
    const { width: c_w, height: c_h } = container.getBoundingClientRect();
    const { width:   w, height:   h } = element.getBoundingClientRect();

    const left = (c_w - w)/2;
    const top = c_h - 1.05 * h;
    $(element).offset( { left, top } );

};

export let juiceboxMouseHandler = ({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY, structureLength }) => {

    const { genomicStart, genomicEnd } = structureManager.locus;

    const [ gs, s, e, ge ] =
        [
            numberFormatter(Math.round(genomicStart)),
            numberFormatter(Math.round(startXBP)),
            numberFormatter(Math.round(endXBP)),
            numberFormatter(Math.round(genomicEnd))
        ];

    let _a;
    let _b;
    let interpolant;

    [ _a, _b ] = [ (startXBP - genomicStart)/(genomicEnd - genomicStart), (endXBP - genomicStart)/(genomicEnd - genomicStart) ];
    interpolant = lerp(_a, _b, interpolantX);

    console.log('interpolant ' + interpolant);

    const segmentIndexX = segmentIndexForInterpolant(interpolant, structureLength);

    [ _a, _b ] = [ (startYBP - genomicStart)/(genomicEnd - genomicStart), (endYBP - genomicStart)/(genomicEnd - genomicStart) ];
    interpolant = lerp(_a, _b, interpolantY);
    const segmentIndexY = segmentIndexForInterpolant(interpolant, structureLength);

    if (segmentIndexX === segmentIndexY) {
        sceneManager.colorRampPanel.colorRampWidget.highlight([ segmentIndexX ]);
    } else {
        sceneManager.colorRampPanel.colorRampWidget.highlight([ segmentIndexX, segmentIndexY ]);
    }

    // globalEventBus.post({type: "DidSelectSegmentIndex", data: segmentIndex });
};

export default JuiceboxPanel;
