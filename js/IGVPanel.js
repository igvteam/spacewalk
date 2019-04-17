import { globalEventBus } from "./eventBus.js";
import igv from '../vendor/igv.esm.js'
import { segmentIndexForInterpolant } from './colorRampWidget.js';
import { makeDraggable } from "./draggable.js";
import { lerp, quantize } from "./math.js";
import { sceneManager } from './main.js';

let currentURL = undefined;

class IGVPanel {

    constructor ({ container, panel }) {

        this.container = container;
        this.$panel = $(panel);

        layout(container, panel);

        makeDraggable(panel, $(panel).find('.trace3d_card_drag_container').get(0));

        this.$track_label = $('#trace3d_igv_track_label');

        $(window).on('resize.trace3d.trace3d_igv_panel', () => { this.onWindowResize(container, panel) });

        $(panel).on('mouseenter.trace3d.trace3d_igv_panel', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidEnterGUI" });
        });

        $(panel).on('mouseleave.trace3d.trace3d_igv_panel', (event) => {
            event.stopPropagation();
            sceneManager.colorRampPanel.colorRampWidget.repaint();
            globalEventBus.post({ type: "DidLeaveGUI" });
        });

        // URL
        const $url_input = $('#trace3d_igv_panel_url_input');
        $url_input.val('');

        const $url_button = $('#trace3d_igv_panel_url_button');

        $url_input.on('change.trace3d_igv_panel_url_input', (event) => {
            event.stopPropagation();
            // console.log('url on change - value ' + event.target.value);
            currentURL = event.target.value;
        });

        const $url_container = $('#trace3d_igv_container');

        $url_button.on('click.trace3d_igv_panel_url_button', async (event) => {
            event.stopPropagation();
            $url_input.trigger('change.trace3d_igv_panel_url_input');
            await this.loadURL({ url: currentURL, $spinner: $url_container.find('.spinner-border')});

            $url_input.val('');
            currentURL = undefined;
        });

        globalEventBus.subscribe("ToggleUIControl", this);
    }

    async receiveEvent({ type, data }) {

        const { payload } = data;

        if ("ToggleUIControl" === type && this.$panel.attr('id') === payload) {

            this.$panel.toggle();

            if (this.$panel.is(":visible")) {

                layout(this.container, this.$panel.get(0));

                const { chr, start, end } = this.locus;
                await this.browser.goto(chr, start, end);
            }

        }
    }

    async createBrowser (config) {

        try {
            this.browser = await igv.createBrowser( this.$panel.find('#trace3d_igv_root_container').get(0), config );

            // TODO: Make less fragile
            const [ chr, se ] = config.locus[ 0 ].split(':');
            const [ start, end ] = se.split('-').map(str => parseInt(str, 10));

            this.locus = { chr, start, end };
            return this.browser;
        } catch (error) {
            console.warn(error.message);
            return undefined;
        }

    }

    async goto({ chr, start, end }) {
        this.locus = { chr, start, end };
        await this.browser.goto(chr, start, end);
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

    onWindowResize(container, panel) {
        layout(container, panel);
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
    const { width: c_w, height: c_h } = container.getBoundingClientRect();
    const { width:   w, height:   h } = element.getBoundingClientRect();

    const left = (c_w - w)/2;
    const top = c_h - 1.1 * h;
    $(element).offset( { left, top } );

};

export let igvConfigurator = () => {

    let config =
        {
            showCursorTrackingGuide: true,
            showTrackLabels: false,
            showIdeogram: false,
            // showControls: false,
            // showNavigation: false,

            "reference":
                {
                    "id": "hg38",
                    "name": "Human (GRCh38/hg38)",
                    "fastaURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg38/hg38.fa",
                    "indexURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg38/hg38.fa.fai",
                    "cytobandURL": "https://s3.amazonaws.com/igv.org.genomes/hg38/annotations/cytoBandIdeo.txt.gz"
                },
            "locus":
                [
                    "chr21:28000000-30000000"
                ],
            "tracks":
                [
                    {
                        "type": "sequence",
                        "order": -1.7976931348623157e+308
                    },
                    {
                        "url": "https://www.encodeproject.org/files/ENCFF722EUH/@@download/ENCFF722EUH.bigWig",
                        "color": "#002eff",
                        "name": "IMR-90 CTCF signal p-value ENCSR000EFI",
                        "format": "bigwig",
                        "type": "wig",
                        "filename": "ENCFF722EUH.bigWig",
                        "sourceType": "file",
                        "height": 50,
                        "min": 0,
                        "max": 10,
                        "autoScale": false,
                        "autoscale": false,
                        "order": 4
                    },
                    // {
                    //     "url": "https://www.encodeproject.org/files/ENCFF079FWO/@@download/ENCFF079FWO.bigBed",
                    //     "color": "rgb(0,0,150)",
                    //     "name": "IMR-90 CTCF optimal idr thresholded peaks ENCSR000EFI",
                    //     "format": "bigbed",
                    //     "type": "annotation",
                    //     "filename": "ENCFF079FWO.bigBed",
                    //     "sourceType": "file",
                    //     "maxRows": 500,
                    //     "order": 7
                    // },
                    // {
                    //     "url": "https://www.encodeproject.org/files/ENCFF298BFT/@@download/ENCFF298BFT.bigWig",
                    //     "color": "#018448",
                    //     "name": "IMR-90 RAD21 signal p-value ENCSR000EFJ",
                    //     "format": "bigwig",
                    //     "type": "wig",
                    //     "filename": "ENCFF298BFT.bigWig",
                    //     "sourceType": "file",
                    //     "height": 50,
                    //     "min": 0,
                    //     "max": 10,
                    //     "autoScale": false,
                    //     "autoscale": false,
                    //     "order": 8
                    // },
                    // {
                    //     "url": "https://www.encodeproject.org/files/ENCFF087JJO/@@download/ENCFF087JJO.bigBed",
                    //     "color": "rgb(0,0,150)",
                    //     "name": "IMR-90 RAD21 conservative idr thresholded peaks ENCSR000EFJ",
                    //     "format": "bigbed",
                    //     "type": "annotation",
                    //     "filename": "ENCFF087JJO.bigBed",
                    //     "sourceType": "file",
                    //     "maxRows": 500,
                    //     "order": 9
                    // },
                    {
                        "name": "Refseq Genes",
                        "format": "refgene",
                        "url": "https://s3.amazonaws.com/igv.org.genomes/hg38/refGene.sorted.txt.gz",
                        "indexURL": "https://s3.amazonaws.com/igv.org.genomes/hg38/refGene.sorted.txt.gz.tbi",
                        "visibilityWindow": -1,
                        "removable": false,
                        "order": 1000000,
                        "filename": "refGene.sorted.txt.gz",
                        "sourceType": "file",
                        "type": "annotation",
                        "maxRows": 500,
                        "filterTypes":
                            [
                                "chromosome",
                                "gene"
                            ]
                    }
                ]
        };

    return config;
}

export let mouseHandler = ({ bp, start, end, interpolant, structureLength }) => {

    const segmentIndex = segmentIndexForInterpolant(interpolant, structureLength);

    sceneManager.colorRampPanel.colorRampWidget.highlight(segmentIndex);

    // globalEventBus.post({type: "DidSelectSegmentIndex", data: segmentIndex });
};

export default IGVPanel;
