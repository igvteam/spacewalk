import igv from '../vendor/igv.esm.js'
import { makeDraggable } from "./draggable.js";
import { globalEventBus } from "./eventBus.js";
import { fitToContainer, getMouseXY } from "./utils.js";
import { rgb255, rgb255String, appleCrayonColorRGB255 } from "./color.js";

class IGVPalette {
    constructor ({ container, palette }) {

        const canvas = $('#trace3d_igv_track_container').find('canvas').get(0);

        fitToContainer(canvas);

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // this.ctx.fillStyle = rgb255String(appleCrayonColorRGB255('honeydew'));
        // this.ctx.fillRect(0, 0, this.ctx.canvas.offsetWidth, this.ctx.canvas.offsetHeight);

        $(window).on('resize.trace3d.trace3d_igv_palette', () => { this.onWindowResize(container, palette) });

        $(palette).on('mouseenter.trace3d.trace3d_igv_palette', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidEnterGUI" });
        });

        $(palette).on('mouseleave.trace3d.trace3d_igv_palette', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidLeaveGUI" });
        });

        layout(container, palette);

        makeDraggable(palette, palette);

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
                // $(browser.trackContainerDiv).off();
                // const noop = () => {};
                // browser.cancelTrackPan = browser.startTrackDrag = browser.updateTrackDrag = browser.endTrackDrag = noop;
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
            this.onContainerMouseMove(event)
        });

    }

    async loadLowLevelTrack({ genomeID, url }) {

        if (undefined === this.genome) {
            this.genome = await this.createGenome(genomeID);
        }

        let config = { url };

        // NOTE: config is edited in place!
        igv.inferTrackTypes(config);

        this.track = igv.trackFactory["feature"](config, { genome: this.genome, genomicStateList: [ {} ]});
        return this.track;
    }

    async createGenome(genomeID) {

        // TODO: This is necessary otherwise igv.GenomeUtils.genomeList is undefined if browser is not created.
        igv.GenomeUtils.genomeList = "https://s3.amazonaws.com/igv.org.genomes/genomes.json";

        const config = await igv.GenomeUtils.expandReference(genomeID);
        const genome = await igv.GenomeUtils.loadGenome(config);
        return genome;
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

        // this.ctx.fillStyle = rgb255String(appleCrayonColorRGB255('honeydew'));

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

    goto({chr, start, end}) {

        this.bpp = (end - start) / this.ctx.canvas.offsetWidth;
        this.referenceFrame = new igv.ReferenceFrame(this.genome, chr, start, end, this.bpp);

        if (igv.browser) {
            igv.browser.goto(chr, start, end);
        }

    }

    onWindowResize(container, palette) {
        layout(container, palette);
    };

    onContainerMouseMove(event){
        const { x, y } = getMouseXY(this.renderer.domElement, event);
        console.log('canvas x ' + x + ' y ' + y);
    };

}

let layout = (container, element) => {

    // const { left, top, right, bottom, x, y, width, height } = container.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    const left = (containerRect.width - elementRect.width)/2;
    const top = containerRect.height - (1.25 * elementRect.height);
    $(element).offset( { left, top } );

};

export default IGVPalette;
