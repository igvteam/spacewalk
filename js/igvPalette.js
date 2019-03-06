import igv from '../vendor/igv.esm.js'
import { makeDraggable } from "./draggable.js";
import { globalEventBus } from "./eventBus.js";

class IGVPalette {
    constructor ({ container, palette }) {

        layout(container, palette);

        // makeDraggable(palette, palette);

        $(window).on('resize.trace3d.trace3d_igv_palette', () => { this.onWindowResize(container, palette) });

        $(palette).on('mouseenter.trace3d.trace3d_igv_palette', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidEnterGUI" });
        });

        $(palette).on('mouseleave.trace3d.trace3d_igv_palette', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidLeaveGUI" });
        });

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
                $(browser.trackContainerDiv).off();
                const noop = () => {};
                browser.cancelTrackPan = browser.startTrackDrag = browser.updateTrackDrag = browser.endTrackDrag = noop;
            });
    }

    async loadTrack(url) {
        this.track = await igv.browser.loadTrack({ url });
    }

    configure({ chr, start, end }) {
        igv.browser.goto(chr, start, end);
    }

    // Each segment "ball" is point in genomic space. Find features (genomic range) that overlap that point.
    async buildFeatureSegmentIndices({ chr, start, end, stepSize }) {

        this.featureSegmentIndices = new Set();

        const bpp = igv.browser.genomicStateList[ 0 ].referenceFrame.bpPerPixel;
        const features = await this.track.getFeatures(chr, start, end, bpp);

        for (let feature of features) {

            const index = Math.floor((feature.start - start) / stepSize);

            const one_based = 1 + index;
            if(index >= 0) {
                this.featureSegmentIndices.add(one_based);
            }
        }

    }

    onWindowResize(container, palette) {
        layout(container, palette);
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
