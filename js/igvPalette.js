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

        $url_button.on('click.trace3d_igv_palette_url_button', (event) => {
            event.stopPropagation();
            $url_input.trigger('change.trace3d_igv_palette_url_input');
            this.loadURL({ url: currentURL, $spinner: $url_container.find('.spinner-border')});
            $url_input.val('');
            currentURL = undefined;
        });

        layout(container, palette);

        makeDraggable(palette, palette);

    }

    async loadLowLevelTrack({ genomeID, url }) {

        if (undefined === this.genome) {
            this.genome = await this.createGenome(genomeID);
        }

        let config = { url, height: this.ctx.canvas.offsetHeight };

        // NOTE: config is edited in place!
        igv.inferTrackTypes(config);

        this.track = igv.createLowLevelTrack(config, { genome: this.genome, genomicStateList: [ {} ]});

        return this.track;
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

        track.draw(config);

        /*
        this.ctx.fillStyle = rgb255String(appleCrayonColorRGB255('honeydew'));

        this.ctx.fillRect(0, 0, this.ctx.canvas.offsetWidth, this.ctx.canvas.offsetHeight);

        for (let feature of features) {

            if (feature.end < start || feature.start > end) {
                // do nothing
            } else {

                const xs = Math.round(this.referenceFrame.toPixels(feature.start - start));
                const xe = Math.round(this.referenceFrame.toPixels(feature.end - start));
                const width = Math.max(1, (xe - xs));

                this.ctx.fillStyle = rgb255String(appleCrayonColorRGB255('salmon'));
                this.ctx.fillRect(xs, 0, width, this.ctx.canvas.offsetHeight);
            }

        }
        */

    }

    goto({ chr, start, end }) {

        this.bpp = (end - start) / this.ctx.canvas.offsetWidth;
        this.referenceFrame = new igv.ReferenceFrame(this.genome, chr, start, end, this.bpp);

        if (igv.browser) {
            igv.browser.goto(chr, start, end);
        }

    }

    async createGenome(genomeID) {

        // TODO: This is necessary otherwise igv.GenomeUtils.genomeList is undefined if browser is not created.
        igv.GenomeUtils.genomeList = "https://s3.amazonaws.com/igv.org.genomes/genomes.json";

        const config = await igv.GenomeUtils.expandReference(genomeID);
        const genome = await igv.GenomeUtils.loadGenome(config);
        return genome;
    }

    async createBrowser($container) {

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

    async loadTrack(url) {

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

    async loadURL({ url, $spinner }){

        url = url || '';

        if ('' !== url) {
            $spinner.show();
            const track = await this.loadLowLevelTrack({genomeID: 'hg38', url});
            $spinner.hide();
        }

    };


    onWindowResize(container, palette) {
        layout(container, palette);
    };

}

let onCanvasMouseMove = (canvas, event) => {

    let { x, y } = getMouseXY(canvas, event);

    if (y < 0 || y > canvas.offsetHeight) {
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
