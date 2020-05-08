// import hic from '../../node_modules/juicebox.js/dist/juicebox.esm.js';
import igv from '../../node_modules/igv/dist/igv.esm.js';
import { MultipleTrackFileLoad } from '../../node_modules/igv-widgets/dist/igv-widgets.js';
import ModalTable from '../../node_modules/data-modal/js/modalTable.js'
import { StringUtils } from '../../node_modules/igv-utils/src/index.js'
import TrackLoadController from "./trackLoadController.js";
import { setMaterialProvider } from '../utils.js';
import Panel from "../panel.js";
import { googleEnabled, colorRampMaterialProvider, dataValueMaterialProvider, ensembleManager, eventBus } from "../app.js";

let trackLoadController;

const genomesJSONPath = "resources/genomes.json";

class IGVPanel extends Panel {

    constructor ({ container, panel, isHidden }) {

        const xFunction = (wc, wp) => {
            return (wc - wp)/2;
        };

        const yFunction = (hc, hp) => {
            return hc - (hp * 1.1);
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
                    igv.Alert.presentAlert(e.message);
                }

                try {
                    const str = 'all' === chr ? 'all' : `${ chr }:${ start }-${ end }`;
                    await this.browser.search(str);
                } catch (e) {
                    igv.Alert.presentAlert(e.message);
                }

            })();


        }

    }

    async initialize(config) {

        let genomeList = undefined;
        try {
            genomeList = await igv.xhr.loadJson(genomesJSONPath, {})
        } catch (e) {
            igv.Alert.presentAlert(e.message);
        }

        this.genomeDictionary = {};
        for (let genome of genomeList) {
            this.genomeDictionary[ genome.id ] = genome;
        }

        this.browser = undefined;

        try {
            const root = this.$panel.find('#spacewalk_igv_root_container').get(0);
            this.browser = await igv.createBrowser( root, config );
        } catch (e) {
            igv.Alert.presentAlert(e.message);
        }

        if (this.browser) {

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

            let $googleDriveButton = $('#spacewalk-igv-app-dropdown-google-drive-track-file-button');
            if (!googleEnabled) {
                $googleDriveButton.parent().hide();
                $googleDriveButton = undefined;
            }

            trackLoadController = new TrackLoadController(trackLoadControllerConfigurator({
                browser: this.browser,
                trackRegistryFile: "resources/tracks/trackRegistry.json",
                $googleDriveButton,
                trackLoader: async (configurations) => {
                    await this.loadTrackList(configurations)
                },
                igvxhr: igv.xhr,
                google: igv.google
            }));

            try {
                const dropdownMenu = document.querySelector('#spacewalk-igv-app-track-dropdown-menu');
                const selectModal = document.querySelector('#spacewalk-igv-app-generic-track-select-modal');
                await trackLoadController.updateTrackMenus(this.browser, this.browser.genome.id, trackLoadController.trackRegistryFile, dropdownMenu, selectModal);
            } catch (e) {
                igv.Alert.presentAlert(e.message);
            }

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
                igv.Alert.presentAlert(e.message);
            }

            if (g) {

                try {
                    const dropdownMenu = document.querySelector('#spacewalk-igv-app-track-dropdown-menu');
                    const selectModal = document.querySelector('#spacewalk-igv-app-generic-track-select-modal');
                    await trackLoadController.updateTrackMenus(this.browser, this.browser.genome.id, trackLoadController.trackRegistryFile, dropdownMenu, selectModal);
                } catch (e) {
                    igv.Alert.presentAlert(e.message);
                }

            }

        }

    }

    async loadTrackList(configurations) {

        let tracks = [];
        try {
            tracks = await this.browser.loadTrackList( configurations );
        } catch (e) {
            igv.Alert.presentAlert(e.message);
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

                configureTrackMaterialProviderGUI(track);

                track.$input.on('click.igv-panel-material-provider', async (e) => {

                    e.stopPropagation();

                    this.materialProvider = await trackMaterialProviderClickHandler(track);
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
        const { trackViews:tvs } = this.browser;
        let track = tvs.map(tv => tv.track).filter(t => state === t.name).pop();
        track.$input.trigger('click.igv-panel-material-provider');
    }
}

const trackLoadControllerConfigurator = ({ browser, trackRegistryFile, $googleDriveButton, trackLoader, igvxhr, google }) => {

    const encodeModalTableConfig =
        {
            id: "igv-app-encode-modal",
            title: "ENCODE",
            selectionStyle: 'multi',
            pageLength: 100,
            selectHandler: async configurations => await trackLoader( configurations )
        };

    const multipleTrackFileLoadConfig =
        {
            $localFileInput: $('#spacewalk-igv-app-dropdown-local-track-file-input'),
            $dropboxButton: $('#spacewalk-igv-app-dropdown-dropbox-track-file-button'),
            $googleDriveButton,
            fileLoadHandler: async configurations => await trackLoader(configurations),
            multipleFileSelection: true,
            igvxhr,
            google
        };


    // const dropdownMenu = document.querySelector('#spacewalk-igv-app-track-dropdown-menu');
    // const selectModal = document.querySelector('#spacewalk-igv-app-generic-track-select-modal');

    return {
        browser,
        trackRegistryFile,
        trackLoadModal: $('#spacewalk-igv-app-track-from-url-modal').get(0),
        multipleTrackFileLoad: new MultipleTrackFileLoad(multipleTrackFileLoadConfig),
        encodeModalTable: new ModalTable(encodeModalTableConfig)
    }

}

const configureTrackMaterialProviderGUI = track => {

    const { trackDiv } = track.trackView;

    const $container = $(trackDiv).find('.igv-left-hand-gutter');

    const $div = $('<div>', { class: 'input-group' });
    $container.append($div);

    track.$input = $('<input>', { type: 'checkbox' });
    $div.append(track.$input);

};

const trackMaterialProviderClickHandler = async track => {

    const { trackContainerDiv } = track.browser;

    // unselect other track's checkboxes
    const $otherInputs = $(trackContainerDiv).find('.input-group input').not(track.$input.get(0));
    $otherInputs.prop('checked', false);

    if (track.$input.is(':checked')) {

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
                console.log(`wig track features. ${ bpPerPixel } start ${ StringUtils.numberFormatter(start) } end ${ StringUtils.numberFormatter(end) } min ${ min } max ${ max }`);
                dataValueMaterialProvider.configure({ startBP: start, endBP: end, features, min, max });

            } else {
                dataValueMaterialProvider.configure({ startBP: start, endBP: end, features, min: undefined, max: undefined });
            }

        }

        return dataValueMaterialProvider
    } else {
         return colorRampMaterialProvider
    }

};

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
    return {
        genome: 'hg19',
        showRuler: false,
        showControls: false,
        queryParametersSupported: false
    };
};

export { trackLoadController, igvBrowserConfigurator };

export default IGVPanel;
