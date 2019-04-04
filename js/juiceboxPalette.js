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

        let browser = await hic.createBrowser(config.container, config);

        layout(this.container, this.$palette.get(0));

        return browser;
    }

    async goto({ chr, start, end }) {
        await this.browser.goto(chr, start, end);
    }

    async defaultConfiguration () {

        await this.gotoDefaultLocus();

        // const url = 'https://www.encodeproject.org/files/ENCFF079FWO/@@download/ENCFF079FWO.bigBed';
        // const url = 'https://www.dropbox.com/s/cj909wdtckjsptx/ENCFF079FWO.bigBed?dl=0';

        // const url = 'https://www.encodeproject.org/files/ENCFF298BFT/@@download/ENCFF298BFT.bigWig';
        const url = 'https://www.dropbox.com/s/ay6x1im4s1didp2/ENCFF298BFT.bigWig?dl=0';

        await this.loadTrack(url);

    }

    async gotoDefaultLocus() {
        await this.goto({ chr:'chr21', start:28e6, end:30e6 });
    }

    async loadTrack(url) {

        try {
            const track = await igv.browser.loadTrack({ url });
            return track;
        } catch (error) {
            console.warn(error.message);
            return undefined;
        }

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

let _createBrowsers = async (container, query, config) => {

    if (query && query.hasOwnProperty( 'juicebox' )) {

        let q = query[ 'juicebox' ];

        if (q.startsWith("%7B")) {
            q = decodeURIComponent(q);
        }

        q = q.substr(1, q.length - 2);

        let parts = q.split("},{");
        config.href = decodeURIComponent(parts[0]);

        hic.createBrowser(container, config);

        if (parts && parts.length > 1) {

            for (let part of parts) {

                config = Object.assign({}, config);
                config.href = decodeURIComponent(part);

                await hic.createBrowser(container, config, syncBrowsers);
            }

        }

    } else {
        await hic.createBrowser(container, config);
    }
};

let syncBrowsers = () => {
    hic.syncBrowsers(hic.allBrowsers);
};

let layout = (container, element) => {

    // const { left, top, right, bottom, x, y, width, height } = container.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    const left = (containerRect.width - elementRect.width)/2;
    const top = containerRect.height - 1.05 * elementRect.height;

    $(element).offset( { left, top } );

};

export default JuiceboxPalette;
