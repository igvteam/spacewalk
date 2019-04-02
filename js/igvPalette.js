import igv from '../vendor/igv.esm.js'
import { makeDraggable } from "./draggable.js";
import { globalEventBus } from "./eventBus.js";
import { lerp, quantize } from "./math.js";

let currentURL = undefined;

class IGVPalette {

    constructor ({ container, palette }) {

        this.$palette = $(palette);

        layout(container, palette);

        makeDraggable(palette, $(palette).find('.trace3d_card_drag_container').get(0));

        this.$track_label = $('#trace3d_igv_track_label');

        $(window).on('resize.trace3d.trace3d_igv_palette', () => { this.onWindowResize(container, palette) });

        $(palette).on('mouseenter.trace3d.trace3d_igv_palette', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidEnterGUI" });
        });

        $(palette).on('mouseleave.trace3d.trace3d_igv_palette', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidLeaveGUI" });
        });

        // URL
        const $url_input = $('#trace3d_igv_palette_url_input');
        $url_input.val('');

        const $url_button = $('#trace3d_igv_palette_url_button');

        $url_input.on('change.trace3d_igv_palette_url_input', (event) => {
            event.stopPropagation();
            // console.log('url on change - value ' + event.target.value);
            currentURL = event.target.value;
        });

        const $url_container = $('#trace3d_igv_container');

        $url_button.on('click.trace3d_igv_palette_url_button', async (event) => {
            event.stopPropagation();
            $url_input.trigger('change.trace3d_igv_palette_url_input');
            await this.loadURL({ url: currentURL, $spinner: $url_container.find('.spinner-border')});

            $url_input.val('');
            currentURL = undefined;
        });

        globalEventBus.subscribe("ToggleUIControls", this);
    }

    receiveEvent({ type }) {
        if ("ToggleUIControls" === type) {
            this.$palette.toggle();
        }
    }

    async createBrowser (config) {

        try {
            this.browser = await igv.createBrowser( this.$palette.find('#trace3d_igv_root_container').get(0), config );
            return this.browser;
        } catch (error) {
            console.warn(error.message);
            return undefined;
        }

    }

    async goto({ chr, start, end }) {
        await this.browser.goto(chr, start, end);
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

    // Each segment "ball" is point in genomic space. Find features (genomic range) that overlap that point.
    async buildFeatureSegmentIndices({ chr, start, end, stepSize }) {

        this.featureSegmentIndices = new Set();

        const features = await this.track.getFeatures(chr, start, end, this.bpp);

        for (let feature of features) {

            const index = Math.floor((feature.start - start) / stepSize);

            const one_based = 1 + index;
            if(index >= 0) {
                this.featureSegmentIndices.add(one_based);
            }
        }

    }

}

let layout = (container, element) => {

    // const { left, top, right, bottom, x, y, width, height } = container.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    const left = (containerRect.width - elementRect.width)/2;
    const top = containerRect.height - 1.1 * elementRect.height;

    $(element).offset( { left, top } );

};

export let mouseHandler = ({ bp, start, end, interpolant, structureLength }) => {
    const quantized = quantize(interpolant, structureLength);
    const one_based = lerp(1, structureLength, quantized);
    const segmentIndex = Math.ceil(one_based);
    globalEventBus.post({type: "DidSelectSegmentIndex", data: segmentIndex });
};

export default IGVPalette;
