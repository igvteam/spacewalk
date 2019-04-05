import { makeDraggable } from "./draggable.js";
import { globalEventBus } from "./eventBus.js";

class JuiceboxPalette {

    constructor ({ container, palette }) {

        this.container = container;

        this.$palette = $(palette);

        layout(container, palette);

        makeDraggable(palette, $(palette).find('.trace3d_card_drag_container').get(0));

        $(window).on('resize.trace3d.juicebox_palette', () => { this.onWindowResize(container, palette) });

        $(palette).on('mouseenter.trace3d.juicebox_palette', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidEnterGUI" });
        });

        $(palette).on('mouseleave.trace3d.juicebox_palette', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidLeaveGUI" });
        });

        globalEventBus.subscribe("ToggleUIControls", this);
    }

    receiveEvent({ type }) {
        if ("ToggleUIControls" === type) {
            this.$palette.toggle();
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
            layout(this.container, this.$palette.get(0));
            this.browser = browser;
            return browser;
        } catch (error) {
            console.warn(error.message);
            return undefined;
        }
    }

    goto({ chr, start, end }) {
        const locus = chr + ':' + start + '-' + end;
        this.browser.parseGotoInput(locus);
    }

    async defaultConfiguration () {

        const config =
            {
                url: "https://hicfiles.s3.amazonaws.com/hiseq/gm12878/in-situ/HIC010.hic",
                name: "Rao and Huntley et al. | Cell 2014 GM12878 (human) in situ MboI HIC010 (47M)",
                isControl: false
            };

        await this.browser.loadHicFile(config);

        this.goto({ chr:'chr21', start:28e6, end:30e6 });
    }

    async loadURL({ url, $spinner }){

        url = url || '';

        if ('' !== url) {
            $spinner.show();
            let track = await this.loadTrack(url);
            $spinner.hide();
        }

    };

    onWindowResize(container, palette) {
        layout(container, palette);
    };

}

let layout = (container, element) => {

    // const { left, top, right, bottom, x, y, width, height } = container.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    const left = (containerRect.width - elementRect.width)/2;
    const top = containerRect.height - 1.05 * elementRect.height;

    $(element).offset( { left, top } );

};

export default JuiceboxPalette;
