import igv from '../vendor/igv.esm.js'
import { makeDraggable } from "./draggable.js";
import { globalEventBus } from "./eventBus.js";
import { fitToContainer, getMouseXY } from "./utils.js";
import { clamp } from "./math.js";
import { rgb255, rgb255String, appleCrayonColorRGB255 } from "./color.js";

let currentURL = undefined;

class IGVPalette {

    constructor ({ container, palette }) {

        const canvas = $('#trace3d_igv_track_container').find('canvas').get(0);

        fitToContainer(canvas);

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.$track_label = $('#trace3d_igv_track_label');

        $(container).on('mousemove.trace3d.trace3d_igv_track_canvas', (event) => {
            onCanvasMouseMove(canvas, event)
        });

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

        layout(container, palette);

        makeDraggable(palette, $(palette).find('.trace3d_card_drag_container').get(0));

    }

    async loadLowLevelTrack({ genomeID, url }) {

        if (undefined === this.genome || this.genome.id !== genomeID) {
            this.genome = await this.createGenome(genomeID);
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

    async gotoDefaultLocus() {
        await this.goto({ chr:'chr21', start:28e6, end:30e6 });
    }

    async goto({ chr, start, end }) {

        this.locus = { chr, start, end };

        this.bpp = (end - start) / this.ctx.canvas.offsetWidth;
        this.referenceFrame = new igv.ReferenceFrame(this.genome, chr, start, end, this.bpp);

        const features = await this.track.getFeatures(chr, start, end, this.bpp);

        this.render({ track: this.track, features, start, end });
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
        const { chr, start, end } = this.locus;
        const features = await this.track.getFeatures(chr, start, end, this.bpp);
        this.render({ track: this.track, features, start, end });
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

        const config = await igv.GenomeUtils.expandReference(genomeID);
        const genome = await igv.GenomeUtils.loadGenome(config);
        return genome;
    }

    async loadURL({ url, $spinner }){

        url = url || '';

        if ('' !== url) {
            $spinner.show();
            await this.loadLowLevelTrack({genomeID: 'hg38', url});
            await this.repaint();
            $spinner.hide();
        }

    };

    onWindowResize(container, palette) {
        layout(container, palette);
    };

    async DEPRICATED_loadTrack(url) {

        this.track = await igv.browser.loadTrack({ url });

        igv.browser.$root.off();

        $(igv.browser.trackContainerDiv).off();

        for (let trackView of igv.browser.trackViews) {
            for (let viewport of trackView.viewports) {
                viewport.$viewport.off();
            }
        }

        // discard canvas mouse handlers
        const canvas = this.track.trackView.viewports[ 0 ].canvas;
        $(canvas).off();

        // add canvas mouse handler
        $(canvas).on('mousemove.trace3d.igvpalette.track', (event) => {
            this.onCanvasMouseMove(undefined, event)
        });

    }

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
    const top = containerRect.height - (1.25 * elementRect.height);
    $(element).offset( { left, top } );

};

export default IGVPalette;
