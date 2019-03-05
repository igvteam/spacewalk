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

        const config =
            {
                genome: 'hg19',
                locus: 'egfr',
                showIdeogram: false,
                showNavigation: false
            };
        igv
            .createBrowser($('#trace3d_igv_container'), config);

    }

    configure({ chr, start, end }) {
        igv.browser.goto(chr, start, end);
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
    const top = containerRect.height - (1.5 * elementRect.height);
    $(element).offset( { left, top } );

};

export default IGVPalette;
