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

        this.ctx.fillStyle = rgb255String(appleCrayonColorRGB255('salmon'));
        this.ctx.fillRect(0, 0, this.ctx.canvas.offsetWidth, this.ctx.canvas.offsetHeight);

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

    async loadNakedTrack(url) {

        let config = { url };
        igv.inferTrackTypes(config);
        this.track = igv.trackFactory["feature"](config, { genome: 'hg19' });
        return this.track;
    }

    // Each segment "ball" is point in genomic space. Find features (genomic range) that overlap that point.
    async buildFeatureSegmentIndices({ chr, start, end, stepSize }) {

        this.featureSegmentIndices = new Set();

        const bpp = (end - start) / this.ctx.canvas.offsetWidth;
        const features = await this.track.getFeatures(chr, start, end, bpp);

        for (let feature of features) {

            const index = Math.floor((feature.start - start) / stepSize);

            const one_based = 1 + index;
            if(index >= 0) {
                this.featureSegmentIndices.add(one_based);
            }
        }

    }

    configure({ chr, start, end }) {

        igv.browser.goto(chr, start, end);

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
