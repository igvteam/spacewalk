import igv from '../../vendor/igv.esm.js';
import { setMaterialProvider } from '../utils.js';
import TrackLoadController, { trackLoadControllerConfigurator } from "./trackLoadController.js";
import { guiManager, colorRampPanel } from "../gui.js";
import Panel from "../panel.js";
import { globals } from "../app.js";

let trackLoadController;

const genomesJSONPath = "resources/genomes.json";

class IGVPanel extends Panel {

    constructor ({ container, panel }) {

        const isHidden = guiManager.isPanelHidden($(panel).attr('id'));

        const xFunction = (cw, w) => {
            return (cw - w)/2;
        };

        const yFunction = (ch, h) => {
            return ch - (h * 1.1);
        };

        super({ container, panel, isHidden, xFunction, yFunction });

        addResizeListener(panel, () => {

            if (this.browser) {
                this.browser.resize();
            }

        });

        globals.eventBus.subscribe("DidChangeMaterialProvider", this);
        globals.eventBus.subscribe('DidLoadEnsembleFile', this);
        globals.eventBus.subscribe('DidLoadPointCloudFile', this);
    }

    receiveEvent({ type, data }) {

        super.receiveEvent({ type, data });

        if ("DidChangeMaterialProvider" === type) {

            const { trackContainerDiv } = this.browser;
            $(trackContainerDiv).find('.input-group input').prop('checked', false);

        } else if ("DidLoadEnsembleFile" === type || "DidLoadPointCloudFile" === type) {

            (async () => {

                const { genomeID, chr, genomicStart: start, genomicEnd: end } = data;

                try {
                    await this.loadGenomeWithID(genomeID);
                } catch (e) {
                    console.error(e);
                }

                try {
                    const str = 'all' === chr ? 'all' : `${ chr }:${ start }-${ end }`;
                    await this.browser.search(str);
                } catch (e) {
                    console.error(e);
                }

            })();


        }

    }

    initialize(config) {

        (async () => {

            let genomeList = undefined;
            try {
                genomeList = await igv.xhr.loadJson(genomesJSONPath, {})
            } catch (error) {
                console.error(error);
            }

            this.genomeDictionary = {};
            for (let genome of genomeList) {
                this.genomeDictionary[ genome.id ] = genome;
            }

            try {
                this.browser = await igv.createBrowser( this.$panel.find('#spacewalk_igv_root_container').get(0), config );
            } catch (error) {
                console.error(error);
            }

            this.browser.on('trackremoved', (track) => {
                if (track.$input && track.$input.prop('checked')) {
                    setMaterialProvider(colorRampPanel.traceColorRampMaterialProvider);
                }
            });

            addDataValueMaterialProviderGUI(this.browser.trackViews.map(trackView => trackView.track));

            this.browser.setCustomCursorGuideMouseHandler(({ bp, start, end, interpolant }) => {
                IGVMouseHandler({ bp, start, end, interpolant })
            });

            trackLoadController = new TrackLoadController(trackLoadControllerConfigurator(this.browser ));

            try {
                await trackLoadController.updateTrackMenus(this.browser.genome.id);
            } catch (error) {
                console.error(error);
            }

        })();

    }

    async loadGenomeWithID(genomeID) {

        if (genomeID !== this.browser.genome.id) {

            this.browser.removeAllTracks();

            const json = this.genomeDictionary[ genomeID ];

            try {

                await this.browser.loadGenome(json);
            } catch (e) {
                console.error(e);

            }

            try {
                await trackLoadController.updateTrackMenus(this.browser.genome.id);
            } catch (e) {
                console.error(e);
            }

        }

    }

    goto({ chr, start, end }) {

        (async () => {
            const str = 'all' === chr ? 'all' : `${ chr }:${ start }-${ end }`;
            try {
                await this.browser.search(str);
            } catch (e) {
                console.error(e);
            }

        })();
    }

    loadTrackList(configurations) {

        (async () => {

            let tracks = [];
            try {
                tracks = await this.browser.loadTrackList( configurations );
            } catch (error) {
                console.warn(error.message);
            }

            for (let track of tracks) {

                this.browser.setTrackLabelName(track.trackView, track.config.name);

                if (track.getFeatures && typeof track.getFeatures === "function") {
                    track.featureDescription = ('wig' === track.type) ? 'varying' : 'constant';
                }

            }

            addDataValueMaterialProviderGUI(tracks);

            this.presentPanel();

        })();

    }

    loadTrack(trackConfiguration) {
        this.loadTrackList([trackConfiguration]);
    }

}

const IGVMouseHandler = ({ bp, start, end, interpolant }) => {

    if (undefined === globals.ensembleManager || undefined === globals.parser.locus) {
        return;
    }

    const { genomicStart, genomicEnd } = globals.parser.locus;

    const xRejection = start > genomicEnd || end < genomicStart || bp < genomicStart || bp > genomicEnd;

    if (xRejection) {
        return;
    }

    const segmentID = globals.ensembleManager.segmentIDForGenomicLocation(bp);

    globals.eventBus.post({ type: 'DidSelectSegmentID', data: { interpolantList: [ interpolant ], segmentIDList: [ segmentID ]} });
};

const addDataValueMaterialProviderGUI = tracks => {

    for (let track of tracks) {

        if (track.featureDescription) {

            const { trackDiv } = track.trackView;

            const $container = $(trackDiv).find('.igv-left-hand-gutter');

            const $div = $('<div>', { class: 'input-group' });
            $container.append($div);

            track.$input = $('<input>', { type: 'checkbox' });
            $div.append(track.$input);

            track.$input.on('click.igv-panel.encode-loader', async (e) => {

                e.stopPropagation();

                const { trackContainerDiv } = track.browser;

                // unselect other track's checkboxes
                const $otherInputs = $(trackContainerDiv).find('.input-group input').not(track.$input.get(0));
                $otherInputs.prop('checked', false);

                if (track.$input.prop('checked')) {

                    const { chromosome, start, end, referenceFrame } = track.browser.genomicStateList[ 0 ];

                    const { name: chr } = chromosome;

                    const { bpPerPixel } = referenceFrame;

                    // If "zoom in" notice is displayed do not paint features on trace
                    if (track.trackView.viewports[ 0 ].$zoomInNotice.is(":visible")) {

                        globals.dataValueMaterialProvider.configure({ startBP: start, endBP: end, features: undefined, min: undefined, max: undefined });

                    } else {

                        const features = await track.getFeatures(chr, start, end, bpPerPixel);

                        if ('varying' === track.featureDescription) {
                            const { min, max } = track.dataRange;
                            globals.dataValueMaterialProvider.configure({ startBP: start, endBP: end, features, min, max });

                        } else {
                            globals.dataValueMaterialProvider.configure({ startBP: start, endBP: end, features, min: undefined, max: undefined });
                        }

                    }

                    setMaterialProvider(globals.dataValueMaterialProvider);
                } else {
                    setMaterialProvider(colorRampPanel.traceColorRampMaterialProvider);
                }

            });

        }
    }
};

const igvBrowserConfigurator = () => {
    return { genome: 'hg19' };
};

export { trackLoadController, igvBrowserConfigurator };

export default IGVPanel;
