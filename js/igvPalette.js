import igv from '../vendor/igv.esm.js'
import { makeDraggable } from "./draggable.js";
import { globalEventBus } from "./eventBus.js";
import { fitToContainer, getMouseXY } from "./utils.js";
import { clamp } from "./math.js";
import { rgb255, rgb255String, appleCrayonColorRGB255 } from "./color.js";

let currentURL = undefined;

class IGVPalette {

    constructor ({ container, palette }) {

        this.palette = palette;

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

    }

    async createBrowser (config) {

        try {
            this.browser = await igv.createBrowser( $(this.palette).find('#trace3d_igv_root_container').get(0), config );
            return this.browser;
        } catch (error) {
            console.warn(error.message);
            return undefined;
        }

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

    async gotoDefaultLocus() {
        await this.goto({ chr:'chr21', start:28e6, end:30e6 });
    }

    async goto({ chr, start, end }) {
        await this.browser.goto(chr, start, end);
    }

    render({ track, features, start, end }) {

        track.dataRange = igv.doAutoscale(features);

        const config =
            {
                features: features,
                context: this.ctx,
                bpPerPixel: this.bpp,
                bpStart: start,
                pixelWidth: this.ctx.canvas.offsetWidth,
                pixelHeight: this.ctx.canvas.offsetHeight,
                viewportContainerX: 0,
                viewportContainerWidth: this.ctx.canvas.offsetWidth,
                genomicState: {}
            };

        igv.graphics.fillRect(this.ctx, 0, 0, this.ctx.canvas.offsetWidth, this.ctx.canvas.offsetHeight, { fillStyle: rgb255String(appleCrayonColorRGB255('snow')) });

        track.draw(config);

    }

    async repaint() {
        this.browser.updateViews();
    }

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

    async createGenome(genomeID) {


        // TODO: This is necessary otherwise igv.GenomeUtils.genomeList is undefined if browser is not created.
        igv.GenomeUtils.genomeList = "https://s3.amazonaws.com/igv.org.genomes/genomes.json";

        let config;
        try {

            // throw "Let's throw stuff from createGenome(genomeID)";
            config = await igv.GenomeUtils.expandReference(genomeID);
        } catch (error) {
            console.warn(error.message);
            return undefined;
        }

        let genome;
        try {
            genome = await igv.GenomeUtils.loadGenome(config);
            return genome;
        } catch (error) {
            console.warn(error.message);
            return undefined;
        }

    }

    async loadURL({ url, $spinner }){

        url = url || '';

        if ('' !== url) {
            $spinner.show();

            let track = await this.createLoadLowLevelTrack({genomeID: 'hg38', url});

            if (track) {
                await this.repaint();
            }

            $spinner.hide();
        }

    };

    onWindowResize(container, palette) {
        layout(container, palette);
    };

    async DEPRICATED_createBrowser($container) {

        const config =
            {
                genome: 'hg19',
                locus: 'all',
                showTrackLabels: false,
                showIdeogram: false,
                showNavigation: false
            };

        return igv
            .createBrowser($container, config)
            .then((browser) => {
                console.log('browser good to go')
            });
    }

    async DEPRICATED_createLoadLowLevelTrack({genomeID, url}) {

        if (undefined === this.genome || this.genome.id !== genomeID) {
            this.genome = await this.createGenome(genomeID);
            if (undefined === this.genome) {
                return undefined;
            }
        }

        let config =
            {
                url,
                height: this.ctx.canvas.offsetHeight,
                featureHeight: this.ctx.canvas.offsetHeight,
                margin: 0,
                color: rgb255String(appleCrayonColorRGB255('midnight'))
            };

        // NOTE: config is edited in place!
        igv.inferTrackTypes(config);

        this.track = igv.createLowLevelTrack(config, { genome: this.genome, genomicStateList: [ {} ]});

        const { file } = igv.parseUri(url);
        this.$track_label.text(file);

        return this.track;
    }

    async DEPRICATED_goto({ chr, start, end }) {

        this.locus = { chr, start, end };

        this.bpp = (end - start) / this.ctx.canvas.offsetWidth;
        this.referenceFrame = new igv.ReferenceFrame(this.genome, chr, start, end, this.bpp);

        let features = undefined;

        try {
            features = await this.track.getFeatures(chr, start, end, this.bpp);
        } catch(error) {
            console.warn(error.message);
            return;
        }

        this.render({ track: this.track, features, start, end });
    }

    async DEPRICATE_repaint() {
        const { chr, start, end } = this.locus;
        const features = await this.track.getFeatures(chr, start, end, this.bpp);
        this.render({ track: this.track, features, start, end });
    }

}

let onCanvasMouseMove = (canvas, event) => {

    let { x, y } = getMouseXY(canvas, event);

    if (y < 0 || x < 0 || y > canvas.offsetHeight || x > canvas.offsetWidth) {
        // do nothing
    } else {
        console.log(Date.now() + ' canvas x ' + x + ' y ' + y);
    }
};

let layout = (container, element) => {

    // const { left, top, right, bottom, x, y, width, height } = container.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    const left = (containerRect.width - elementRect.width)/2;
    const top = containerRect.height - (3 * elementRect.height);
    $(element).offset( { left, top } );

};

export default IGVPalette;
