import igv from '../../node_modules/igv/dist/igv.esm.js';
import { Alert } from '../../node_modules/igv-ui/src/index.js'
import { TrackFileLoad } from '../../node_modules/igv-widgets/dist/igv-widgets.js';
import ModalTable from '../../node_modules/data-modal/js/modalTable.js'
import TrackLoadController from "./trackLoadController.js";
import { setMaterialProvider } from '../utils.js';
import Panel from "../panel.js";
import { colorRampMaterialProvider, dataValueMaterialProvider, ensembleManager, eventBus } from "../app.js";

let trackLoadController;

const genomesJSONPath = "resources/genomes.json";

class IGVPanel extends Panel {

    constructor ({ container, panel, isHidden }) {

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

        this.$panel.on(`mouseenter.${ this.namespace }.noodle-ribbon-render`, (event) => {
            event.stopPropagation();
            eventBus.post({ type: 'DidEnterGenomicNavigator', data: 'DidEnterGenomicNavigator' });
        });

        this.$panel.on(`mouseleave.${ this.namespace }.noodle-ribbon-render`, (event) => {
            event.stopPropagation();
            eventBus.post({ type: 'DidLeaveGenomicNavigator', data: 'DidLeaveGenomicNavigator' });
        });

        eventBus.subscribe("DidChangeMaterialProvider", this);
        eventBus.subscribe('DidLoadEnsembleFile', this);
    }

    receiveEvent({ type, data }) {

        super.receiveEvent({ type, data });

        if ("DidChangeMaterialProvider" === type) {

            this.materialProvider = data;

            const { trackContainerDiv } = this.browser;
            $(trackContainerDiv).find('.input-group input').prop('checked', false);

        } else if ("DidLoadEnsembleFile" === type) {

            (async () => {

                const { genomeAssembly, chr, genomicStart: start, genomicEnd: end } = data;

                try {
                    await this.loadGenomeWithID( genomeAssembly );
                } catch (e) {
                    Alert.presentAlert(e.message);
                }

                try {
                    const str = 'all' === chr ? 'all' : `${ chr }:${ start }-${ end }`;
                    await this.browser.search(str);
                } catch (e) {
                    Alert.presentAlert(e.message);
                }

            })();


        }

    }

    async initialize(config) {

        let genomeList = undefined;
        try {
            genomeList = await igv.xhr.loadJson(genomesJSONPath, {})
        } catch (e) {
            Alert.presentAlert(e.message);
        }

        this.genomeDictionary = {};
        for (let genome of genomeList) {
            this.genomeDictionary[ genome.id ] = genome;
        }

        try {
            this.browser = await igv.createBrowser( this.$panel.find('#spacewalk_igv_root_container').get(0), config );
        } catch (e) {
            Alert.presentAlert(e.message);
        }

        this.browser.on('trackremoved', (track) => {
            if (track.$input && track.$input.prop('checked')) {
                this.materialProvider = colorRampMaterialProvider;
                setMaterialProvider(this.materialProvider);
            }
        });

        $(this.browser.trackContainerDiv).on(`mouseenter.${ this.namespace }`, (event) => {
            event.stopPropagation();
            eventBus.post({ type: 'DidEnterGUI', data: this });
        });

        $(this.browser.trackContainerDiv).on(`mouseleave.${ this.namespace }`, (event) => {
            event.stopPropagation();
            eventBus.post({ type: 'DidLeaveGUI', data: this });
        });

        this.addDataValueMaterialProviderGUI(this.browser.trackViews.map(trackView => trackView.track));

        this.browser.setCustomCursorGuideMouseHandler(({ bp, start, end, interpolant }) => {
            IGVMouseHandler({ bp, start, end, interpolant })
        });

        // TrackFileLoad
        const trackFileLoadConfig =
            {
                localFileInput: document.querySelector('#spacewalk-igv-app-dropdown-local-track-file-input'),
                dropboxButton: document.querySelector('#spacewalk-igv-app-dropdown-dropbox-track-file-button'),
                googleEnabled: false,
                googleDriveButton: document.querySelector('#spacewalk-igv-app-dropdown-google-drive-track-file-button'),
                loadHandler: async configurations => {
                    return await this.loadTrackList(configurations);
                }
            };

        // ModalTable
        const encodeModalTableConfig =
            {
                id: "igv-app-encode-modal",
                title: "ENCODE",
                pageLength: 100,
                selectHandler: async configurations => {
                    return await this.loadTrackList(configurations);
                }
            };

        const dropdownMenu = document.querySelector('#spacewalk-igv-app-track-dropdown-menu');
        const selectModal = document.querySelector('#spacewalk-igv-app-generic-track-select-modal');

        // TrackLoadController
        const trackLoadControllerConfig =
            {
                browser: this.browser,
                trackRegistryFile: "resources/tracks/trackRegistry.json",
                trackLoadModal: document.querySelector('#spacewalk-igv-app-track-from-url-modal'),
                trackFileLoad: new TrackFileLoad(trackFileLoadConfig),
                encodeModalTable: new ModalTable(encodeModalTableConfig),
                dropdownMenu,
                selectModal
            };

        trackLoadController = new TrackLoadController(trackLoadControllerConfig);

        try {
            await trackLoadController.updateTrackMenus(this.browser, this.browser.genome.id, trackLoadController.trackRegistryFile, dropdownMenu, selectModal);
        } catch (e) {
            Alert.presentAlert(e.message);
        }

    }

    async loadGenomeWithID(genomeID) {

        if (genomeID !== this.browser.genome.id) {

            this.browser.removeAllTracks();

            const json = this.genomeDictionary[ genomeID ];

            let g = undefined;
            try {
                g = await this.browser.loadGenome(json);
            } catch (e) {
                Alert.presentAlert(e.message);
            }

            if (g) {

                const dropdownMenu = document.querySelector('#spacewalk-igv-app-track-dropdown-menu');
                const selectModal = document.querySelector('#spacewalk-igv-app-generic-track-select-modal');

                try {
                    await trackLoadController.updateTrackMenus(this.browser, this.browser.genome.id, trackLoadController.trackRegistryFile, dropdownMenu, selectModal);
                } catch (e) {
                    Alert.presentAlert(e.message);
                }

            }

        }

    }

    async loadTrackList(configurations) {

        let tracks = [];
        try {
            tracks = await this.browser.loadTrackList( configurations );
        } catch (e) {
            Alert.presentAlert(e.message);
        }

        for (let track of tracks) {
            this.browser.setTrackLabelName(track.trackView, track.config.name);
        }

        this.addDataValueMaterialProviderGUI(tracks);

        this.present();


    }

    loadTrack(trackConfiguration) {
        this.loadTrackList([trackConfiguration]);
    }

    addDataValueMaterialProviderGUI(tracks) {

        const dataValueTracks = tracks.filter(track => track.type !== 'ruler' && track.type !== 'sequence' && track.name !== 'Refseq Genes');
        for (let track of dataValueTracks) {

            if (track.getFeatures && typeof track.getFeatures === "function") {
                track.featureDescription = ('wig' === track.type) ? 'varying' : 'constant';
            }

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

                            dataValueMaterialProvider.configure({ startBP: start, endBP: end, features: undefined, min: undefined, max: undefined });

                        } else {

                            const features = await track.getFeatures(chr, start, end, bpPerPixel);

                            if ('varying' === track.featureDescription) {
                                const { min, max } = track.dataRange;
                                dataValueMaterialProvider.configure({ startBP: start, endBP: end, features, min, max });

                            } else {
                                dataValueMaterialProvider.configure({ startBP: start, endBP: end, features, min: undefined, max: undefined });
                            }

                        }

                        this.materialProvider = dataValueMaterialProvider;
                    } else {
                        this.materialProvider = colorRampMaterialProvider;
                    }

                    setMaterialProvider(this.materialProvider);

                });

            }
        }
    };

    getSessionState() {

        for (let track of this.browser.trackViews.map(trackView => trackView.track)) {
            if (track.$input && track.$input.prop('checked')) {
                return track.name;
            }
        }

        return 'none';
    }

    async restoreSessionState(state) {

        let track = this.browser.trackViews
            .map(trackView => trackView.track)
            .filter((track) => { return state === track.name })
            .pop();

        track.$input.prop('checked', true);

        const { chromosome, start, end, referenceFrame } = track.browser.genomicStateList[ 0 ];

        const { name: chr } = chromosome;

        const { bpPerPixel } = referenceFrame;

        const features = await track.getFeatures(chr, start, end, bpPerPixel);

        if ('varying' === track.featureDescription) {
            const { min, max } = track.dataRange;
            dataValueMaterialProvider.configure({ startBP: start, endBP: end, features, min, max });

        } else {
            dataValueMaterialProvider.configure({ startBP: start, endBP: end, features, min: undefined, max: undefined });
        }

        this.materialProvider = dataValueMaterialProvider;

        setMaterialProvider(this.materialProvider);

        eventBus .post({ type: "ToggleUIControl", data: { payload: this.$panel.attr('id') } });

    }
}

const IGVMouseHandler = ({ bp, start, end, interpolant }) => {

    if (undefined === ensembleManager || undefined === ensembleManager.locus) {
        return;
    }

    const { genomicStart, genomicEnd } = ensembleManager.locus;

    const xRejection = start > genomicEnd || end < genomicStart || bp < genomicStart || bp > genomicEnd;

    if (xRejection) {
        return;
    }

    eventBus.post({ type: 'DidSelectSegmentID', data: { interpolantList: [ interpolant ] } });
};

const igvBrowserConfigurator = () => {
    return { genome: 'hg19', showRuler: false, showControls: false };
};

export { trackLoadController, igvBrowserConfigurator };

export default IGVPanel;
