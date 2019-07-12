import Globals from './../globals.js';
import igv from '../../vendor/igv.esm.js';
import { makeDraggable } from "../draggable.js";
import { presentPanel, setMaterialProvider, moveOffScreen, moveOnScreen } from '../utils.js';
import TrackLoadController, { trackLoadControllerConfigurator } from "./trackLoadController.js";
import { igvPanel, guiManager } from "../gui.js";

let trackLoadController;

let currentURL = undefined;
class IGVPanel {

    constructor ({ container, panel }) {

        this.container = container;

        this.$panel = $(panel);
        this.isHidden = guiManager.isPanelHidden(this.$panel.attr('id'));

        if (this.isHidden) {
            moveOffScreen(this);
        } else {
            this.layout();
        }

        makeDraggable(panel, $(panel).find('.spacewalk_card_drag_container').get(0));

        $(window).on('resize.window.spacewalk.spacewalk_igv_panel', () => { this.onWindowResize() });

        addResizeListener(panel, () => {

            if (this.browser) {
                this.browser.resize();
            }

        });

        this.$panel.on('click.spacewalk_igv_panel', event => {
            Globals.eventBus.post({ type: "DidSelectPanel", data: this.$panel });
        });

        this.$panel.on('mouseenter.spacewalk.spacewalk_igv_panel', (event) => {
            event.stopPropagation();
            Globals.eventBus.post({ type: "DidEnterGUI" });
        });

        this.$panel.on('mouseleave.spacewalk.spacewalk_igv_panel', (event) => {
            event.stopPropagation();
            Globals.eventBus.post({ type: "DidLeaveGUI" });
        });

        Globals.eventBus.subscribe("ToggleUIControl", this);
        Globals.eventBus.subscribe("DidChangeMaterialProvider", this);
        Globals.eventBus.subscribe('DidLoadFile', this);
        Globals.eventBus.subscribe('DidLoadPointCloudFile', this);
    }

    receiveEvent({ type, data }) {

        if ("ToggleUIControl" === type && data && data.payload === this.$panel.attr('id')) {

            if (true === this.isHidden) {

                moveOnScreen(this);

                const { chromosome, start, end } = this.browser.genomicStateList[ 0 ];
                const { name: chr } = chromosome;
                this.browser.goto(chr, start, end);
            } else {
                moveOffScreen(this);
            }

            this.isHidden = !this.isHidden;

        } else if ("DidChangeMaterialProvider" === type) {

            const { trackContainerDiv } = igv.browser;
            $(trackContainerDiv).find('.input-group input').prop('checked', false);
        } else if ("DidLoadFile" === type || "DidLoadPointCloudFile" === type) {

            const { chr, genomicStart, genomicEnd } = data;
            this.goto({ chr, start: genomicStart, end: genomicEnd });
        }

    }

    initialize(config) {

        (async () => {
            try {
                this.browser = await igv.createBrowser( this.$panel.find('#spacewalk_igv_root_container').get(0), config );
            } catch (error) {
                console.warn(error.message);
            }

            addDataValueMaterialProviderGUI(this.browser.trackViews.map(trackView => trackView.track));

            this.browser.setCustomCursorGuideMouseHandler(({ bp, start, end, interpolant }) => {
                IGVMouseHandler({ bp, start, end, interpolant })
            });

            trackLoadController = new TrackLoadController(trackLoadControllerConfigurator({ browser: this.browser, trackRegistryFile, $googleDriveButton: undefined } ));
            trackLoadController.updateTrackMenus(this.browser.genome.id);

        })();

    }

    goto({ chr, start, end }) {

        if ('all' === chr) {
            this.browser.search(chr);
        } else {
            this.browser.goto(chr, start, end);
        }

    }

    loadTrackList(configurations) {

        (async () => {

            let tracks = undefined;
            try {
                tracks = await this.browser.loadTrackList( configurations );

                // for (let track of tracks) {
                //     this.browser.setTrackLabelName(track.trackView, track.config.Name)
                // }

            } catch (error) {
                console.warn(error.message);
            }

            addDataValueMaterialProviderGUI(tracks);

            presentPanel(this);

        })();

    }

    loadTrack(trackConfiguration) {
        this.loadTrackList([trackConfiguration]);
    }

    onWindowResize() {
        if (false === this.isHidden) {
            this.layout();
        }
    }

    layout() {

        // const { left, top, right, bottom, x, y, width, height } = container.getBoundingClientRect();
        const { width: c_w, height: c_h } = this.container.getBoundingClientRect();
        const { width:   w, height:   h } = this.$panel.get(0).getBoundingClientRect();

        const left = (c_w - w)/2;
        const top = c_h - 1.1 * h;
        this.$panel.offset( { left, top } );
    }

}

const encodeTrackListLoader = (browser, trackConfigurations) => {
    igvPanel.loadTrackList(trackConfigurations);
};

const IGVMouseHandler = ({ bp, start, end, interpolant }) => {

    if (undefined === Globals.ensembleManager || undefined === Globals.ensembleManager.locus) {
        return;
    }

    const { genomicStart, genomicEnd } = Globals.ensembleManager.locus;

    const xRejection = start > genomicEnd || end < genomicStart || bp < genomicStart || bp > genomicEnd;

    if (xRejection) {
        return;
    }

    const segmentID = Globals.ensembleManager.segmentIDForGenomicLocation(bp);

    Globals.eventBus.post({ type: 'DidSelectSegmentID', data: { interpolantList: [ interpolant ], segmentIDList: [ segmentID ]} });
};

const addDataValueMaterialProviderGUI = tracks => {

    for (let track of tracks) {

        if (track.featureType && 'numeric' === track.featureType) {

            const { trackDiv } = track.trackView;

            const $container = $(trackDiv).find('.igv-left-hand-gutter');

            const $div = $('<div>', { class: 'input-group' });
            $container.append($div);

            const $input = $('<input>', { type: 'checkbox' });
            $div.append($input);

            $input.on('click.igv-panel.encode-loader', async (e) => {

                e.stopPropagation();

                const { trackContainerDiv } = track.browser;

                // unselect  checkboxes
                const $otherInputs = $(trackContainerDiv).find('.input-group input').not($input.get(0));
                $otherInputs.prop('checked', false);

                if ($input.prop('checked')) {

                    const { chromosome, start, end, referenceFrame } = track.browser.genomicStateList[ 0 ];

                    const { name: chr } = chromosome;

                    const { bpPerPixel } = referenceFrame;

                    const features = await track.getFeatures(chr, start, end, bpPerPixel);

                    const { min, max } = track.dataRange;

                    Globals.dataValueMaterialProvider.configure({startBP: start, endBP: end, features, min, max});

                    setMaterialProvider(Globals.dataValueMaterialProvider);

                } else {

                    setMaterialProvider(Globals.traceColorRampMaterialProvider);

                }

            });

        }
    }

};

const igvBrowserConfigurator = () => {
    return { genome: 'hg38' };
};

const igvBrowserConfiguratorBigWig = () => {

    const config =
        {
            genome: 'hg38',
            tracks:
                [

                    {
                        "Assembly": "GRCh38",
                        "ExperimentID": "/experiments/ENCSR580GSX/",
                        "Experiment": "ENCSR580GSX",
                        "Biosample": "A172",
                        "Assay Type": "RNA-seq",
                        "Target": "",
                        "Format": "bigWig",
                        "Output Type": "minus strand signal of all reads",
                        "Lab": "Thomas Gingeras, CSHL",
                        "url": "https://www.encodeproject.org/files/ENCFF439GUL/@@download/ENCFF439GUL.bigWig",
                        "Bio Rep": "1",
                        "Tech Rep": "1_1",
                        "Accession": "ENCFF439GUL",
                        "Name": " RNA-seq 1:1_1 minus strand signal of all reads ENCSR580GSX",
                        "filename": "ENCFF439GUL.bigWig",
                        "sourceType": "file",
                        "format": "bigwig",
                        "type": "wig",
                        "color": "rgb(150,150,150)",
                        "height": 50,
                        "name": "https://www.encodeproject.org/files/ENCFF439GUL/@@download/ENCFF439GUL.bigWig",
                        "autoscale": true,
                        "order": 3
                    },
                    {
                        "Assembly": "GRCh38",
                        "ExperimentID": "/experiments/ENCSR000DND/",
                        "Experiment": "ENCSR000DND",
                        "Biosample": "pancreas male adult (54 years) and male adult (60 years)",
                        "Assay Type": "ChIP-seq",
                        "Target": "CTCF ",
                        "Format": "bigWig",
                        "Output Type": "signal p-value",
                        "Lab": "Vishwanath Iyer, UTA",
                        "url": "https://www.encodeproject.org/files/ENCFF741SLO/@@download/ENCFF741SLO.bigWig",
                        "Bio Rep": "1",
                        "Tech Rep": "1_1",
                        "Accession": "ENCFF741SLO",
                        "Name": " CTCF  1:1_1 signal p-value ENCSR000DND",
                        "filename": "ENCFF741SLO.bigWig",
                        "sourceType": "file",
                        "format": "bigwig",
                        "type": "wig",
                        "color": "rgb(150,150,150)",
                        "height": 50,
                        "name": "https://www.encodeproject.org/files/ENCFF741SLO/@@download/ENCFF741SLO.bigWig",
                        "autoscale": true,
                        "order": 4
                    },
                    {
                        "Assembly": "GRCh38",
                        "ExperimentID": "/experiments/ENCSR000DXZ/",
                        "Experiment": "ENCSR000DXZ",
                        "Biosample": "WI38",
                        "Assay Type": "ChIP-seq",
                        "Target": "H3K4me3 ",
                        "Format": "bigWig",
                        "Output Type": "fold change over control",
                        "Lab": "John Stamatoyannopoulos, UW",
                        "url": "https://www.encodeproject.org/files/ENCFF319QVY/@@download/ENCFF319QVY.bigWig",
                        "Bio Rep": "1,2",
                        "Tech Rep": "1_1,2_1",
                        "Accession": "ENCFF319QVY",
                        "Name": " H3K4me3  1,2:1_1,2_1 fold change over control ENCSR000DXZ",
                        "filename": "ENCFF319QVY.bigWig",
                        "sourceType": "file",
                        "format": "bigwig",
                        "type": "wig",
                        "color": "rgb(150,150,150)",
                        "height": 50,
                        "name": "https://www.encodeproject.org/files/ENCFF319QVY/@@download/ENCFF319QVY.bigWig",
                        "autoscale": true,
                        "order": 5
                    }

                ]
        };

    return config;
};

const genomes = "resources/genomes.json";

const trackRegistryFile = "resources/tracks/trackRegistry.json";

export { trackLoadController, encodeTrackListLoader, igvBrowserConfigurator, igvBrowserConfiguratorBigWig, genomes, trackRegistryFile };

export default IGVPanel;
