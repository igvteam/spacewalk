import { EventBus, AlertSingleton, createTrackWidgetsWithTrackRegistry } from '../../node_modules/igv-widgets/dist/igv-widgets.js'
import { igvxhr, StringUtils } from '../../node_modules/igv-utils/src/index.js'
import igv from './igv.esm.js'
import { setMaterialProvider } from '../utils.js';
import Panel from "../panel.js";
import { googleEnabled, colorRampMaterialProvider, dataValueMaterialProvider, ensembleManager } from "../app.js";

class IGVPanel extends Panel {

    constructor ({ container, panel, isHidden }) {

        const xFunction = (wc, wp) => {
            return (wc - wp)/2;
        };

        const yFunction = (hc, hp) => {
            return hc - (hp * 1.1);
        };

        super({ container, panel, isHidden, xFunction, yFunction });

        this.$panel.on(`mouseenter.${ this.namespace }`, (event) => {
            event.stopPropagation();
            EventBus.globalBus.post({ type: 'DidEnterGenomicNavigator', data: 'DidEnterGenomicNavigator' });
        });

        this.$panel.on(`mouseleave.${ this.namespace }`, (event) => {
            event.stopPropagation();
            EventBus.globalBus.post({ type: 'DidLeaveGenomicNavigator', data: 'DidLeaveGenomicNavigator' });
        });

        EventBus.globalBus.subscribe("DidChangeMaterialProvider", this)
        EventBus.globalBus.subscribe('DidLoadEnsembleFile', this)
        EventBus.globalBus.subscribe('DidChangeGenome', this)

    }

    receiveEvent({ type, data }) {

        super.receiveEvent({ type, data });

        if ("DidChangeGenome" === type) {
            console.log(`IGVPanel - DidChangeGenome - genome id ${ data.genomeID }`)
        } else if ("DidChangeMaterialProvider" === type) {

            this.materialProvider = data;

            const { trackContainer } = this.browser;
            $(trackContainer).find('.input-group input').prop('checked', false);

        } else if ("DidLoadEnsembleFile" === type) {

            (async () => {

                const { genomeAssembly, chr, genomicStart: start, genomicEnd: end } = data;

                console.log(`IGVPanel - DidLoadEnsembleFile - genome id ${ genomeAssembly }`)

                try {
                    await this.loadGenomeWithID( genomeAssembly );
                } catch (e) {
                    AlertSingleton.present(e.message);
                }

                try {
                    const str = 'all' === chr ? 'all' : `${ chr }:${ start }-${ end }`;
                    await this.browser.search(str);
                } catch (e) {
                    AlertSingleton.present(e.message);
                }

            })();


        }

    }

    async initialize({ genomes, trackRegistryFile, igvConfig }) {

        let genomeList = undefined;
        try {
            genomeList = await igvxhr.loadJson(genomes, {})
        } catch (e) {
            AlertSingleton.present(e.message);
        }

        this.genomeDictionary = {};
        for (let genome of genomeList) {
            this.genomeDictionary[ genome.id ] = genome;
        }

        this.browser = undefined;

        try {
            const root = this.$panel.find('#spacewalk_igv_root_container').get(0)
            this.browser = await igv.createBrowser( root, igvConfig )
        } catch (e) {
            AlertSingleton.present(e.message)
        }

        if (this.browser) {

            addResizeListener(this.panel, async () => {

                let str = `all`

                if (ensembleManager.locus) {
                    const { chr, genomicStart, genomicEnd } = ensembleManager.locus
                    str = `${ chr }:${ genomicStart }-${ genomicEnd }`
                }

                await this.browser.resize()

                // console.log(`locus ${ str }`)
                await this.browser.search(str)
            })

            this.browser.on('trackremoved', track => {
                if (track.$input && track.$input.prop('checked')) {
                    this.materialProvider = colorRampMaterialProvider
                    setMaterialProvider(this.materialProvider)
                }
            })

            $(this.browser.trackContainer).on(`mouseenter.${ this.namespace }`, (event) => {
                event.stopPropagation();
                EventBus.globalBus.post({ type: 'DidEnterGUI', data: this });
            });

            $(this.browser.trackContainer).on(`mouseleave.${ this.namespace }`, (event) => {
                event.stopPropagation();
                EventBus.globalBus.post({ type: 'DidLeaveGUI', data: this });
            });

            this.browser.setCustomCursorGuideMouseHandler(({ bp, start, end, interpolant }) => {

                if (undefined === ensembleManager || undefined === ensembleManager.locus) {
                    return;
                }

                const { genomicStart, genomicEnd } = ensembleManager.locus;

                const xRejection = start > genomicEnd || end < genomicStart || bp < genomicStart || bp > genomicEnd;

                if (xRejection) {
                    return;
                }

                EventBus.globalBus.post({ type: 'DidUpdateGenomicInterpolant', data: { interpolantList: [ interpolant ] } });

            });

            this.addDataValueMaterialProviderGUI(this.browser.trackViews.map(trackView => trackView.track));

            createTrackWidgetsWithTrackRegistry(
                $(this.container),
                $('#hic-track-dropdown-menu'),
                $('#hic-local-track-file-input'),
                $('#hic-track-dropdown-dropbox-button'),
                googleEnabled,
                $('#hic-track-dropdown-google-drive-button'),
                ['hic-encode-signal-modal', 'hic-encode-other-modal'],
                'hic-app-track-load-url-modal',
                'hic-app-track-select-modal',
                undefined,
                trackRegistryFile,
                (configurations) => {
                    this.loadTrackList(configurations)
                })

            EventBus.globalBus.post({ type: 'DidChangeGenome', data: { genomeID: this.browser.genome.id }})
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
                AlertSingleton.present(e.message);
            }

            if (g) {
                EventBus.globalBus.post({ type: 'DidChangeGenome', data: { genomeID }})
            }

        }

    }

    async loadTrackList(configurations) {

        let tracks = [];
        try {
            tracks = await this.browser.loadTrackList( configurations );
        } catch (e) {
            AlertSingleton.present(e.message);
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
                this.configureMaterialProviderWidget(track)
            }
        }
    }

    configureMaterialProviderWidget(track) {

        const { trackDiv } = track.trackView

        const $leftHandGutter = $(trackDiv).find('.igv-left-hand-gutter')

        $leftHandGutter.css({ position:'relative' })

        const $canvas = $leftHandGutter.find('canvas')
        $canvas.css({ position:'absolute', top:0, left:0 })

        const $input_div = $('<div>')
        $leftHandGutter.append($input_div)
        $input_div.css({ position:'absolute', top:0, left:0, 'background-color': 'transparent', 'z-index': 4096 })

        const $input = $('<input>', { type: 'checkbox' })
        $input_div.append($input)

        track.$input = $input

        $input.on(`click.${ this.namespace }`, async (e) => {
            e.stopPropagation()
            this.materialProvider = await getMaterialProvider(track)
            setMaterialProvider(this.materialProvider)
        })


    }

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

const getMaterialProvider = async track => {

    const { trackContainer } = track.browser;

    // unselect other track's checkboxes
    const $otherInputs = $(trackContainer).find('.input-group input').not(track.$input.get(0));
    $otherInputs.prop('checked', false);

    if (track.$input.is(':checked')) {

        const { chr, start, initialEnd:end, bpPerPixel } = track.browser.referenceFrameList[ 0 ]

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

}

export default IGVPanel
