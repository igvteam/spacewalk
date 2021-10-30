import { EventBus, AlertSingleton } from 'igv-widgets'
import { igvxhr, StringUtils } from 'igv-utils'
import igv from './igv'
import { setMaterialProvider } from './utils.js';
import Panel from "./panel.js";
import { colorRampMaterialProvider, dataValueMaterialProvider, ensembleManager, loadGenomeWithID } from "./app.js";

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

        EventBus.globalBus.subscribe("DidUpdateGenomicInterpolant", this);
        EventBus.globalBus.subscribe("DidChangeMaterialProvider", this)
        EventBus.globalBus.subscribe('DidLoadEnsembleFile', this)
    }

    receiveEvent({ type, data }) {

        super.receiveEvent({ type, data });

        if ("DidUpdateGenomicInterpolant" === type) {
            const { poster, interpolantList } = data
            if (colorRampMaterialProvider === poster) {
                this.browser.cursorGuide.updateWithInterpolant(interpolantList[ 0 ])
            }
        } else if ("DidChangeMaterialProvider" === type) {

            this.materialProvider = data;

            const { trackContainer } = this.browser;
            $(trackContainer).find('.input-group input').prop('checked', false);

        } else if ("DidLoadEnsembleFile" === type) {

            (async () => {

                const { genomeAssembly, chr, genomicStart: start, genomicEnd: end } = data;

                console.log(`IGVPanel - DidLoadEnsembleFile - genome id ${ genomeAssembly }`)

                try {
                    await loadGenomeWithID(this.browser, genomeAssembly);
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

    async initialize({ igvConfig, session }) {

        this.browser = undefined;

        const root = this.$panel.find('#spacewalk_igv_root_container').get(0)

        try {
            if (session) {
                const { showTrackLabels, showRuler, showControls,showCursorTrackingGuide } = igvConfig
                const mergedConfig = { ...session, ...({ showTrackLabels, showRuler, showControls,showCursorTrackingGuide }) }
                this.browser = await igv.createBrowser( root, mergedConfig )
            } else {
                this.browser = await igv.createBrowser( root, igvConfig )
            }

        } catch (e) {
            AlertSingleton.present(e.message)
        }

        const config =
            {
                handles: "w, sw, s, se, e",
                autoHide: true,
                // aspectRatio: true,
                helper: "spacewalk-threejs-container-resizable-helper",
                stop: async () => {

                    if (this.browser) {

                        let str = `all`

                        if (ensembleManager.locus) {
                            const { chr, genomicStart, genomicEnd } = ensembleManager.locus
                            str = `${ chr }:${ genomicStart }-${ genomicEnd }`
                        }

                        this.browser.resize()
                        this.browser.search(str)

                    }
                }
            };

        this.$panel.resizable(config)

        if (this.browser) {
            this.configureMouseHandlers()
        }
    }

    configureMouseHandlers () {

        this.browser.on('trackremoved', track => {
            if (track.$input && track.$input.prop('checked')) {
                this.materialProvider = colorRampMaterialProvider
                setMaterialProvider(this.materialProvider)
            }
        })

        this.browser.columnContainer.addEventListener('mouseenter', event => {
            event.stopPropagation();
            EventBus.globalBus.post({ type: 'DidEnterGUI', data: this });
        })

        this.browser.columnContainer.addEventListener('mouseleave', event => {
            event.stopPropagation();
            EventBus.globalBus.post({ type: 'DidLeaveGUI', data: this });
        })

        this.browser.setCustomCursorGuideMouseHandler(({ bp, start, end, interpolant }) => {

            if (undefined === ensembleManager || undefined === ensembleManager.locus) {
                return;
            }

            const { genomicStart, genomicEnd } = ensembleManager.locus;

            const xRejection = start > genomicEnd || end < genomicStart || bp < genomicStart || bp > genomicEnd;

            if (xRejection) {
                return;
            }

            EventBus.globalBus.post({ type: 'DidUpdateGenomicInterpolant', data: { poster: this, interpolantList: [ interpolant ] } });

        })

        this.addDataValueMaterialProviderGUI(this.browser.trackViews.map(trackView => trackView.track))

    }

    async loadTrackList(configurations) {

        let tracks = [];
        try {
            tracks = await this.browser.loadTrackList( configurations );
        } catch (e) {
            AlertSingleton.present(e.message);
        }

        for (let track of tracks) {
            track.trackView.setTrackLabelName(track.trackView, track.config.name);
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

    toJSON() {
        return this.browser.toJSON()
    }

    getSessionState() {

        for (let track of this.browser.trackViews.map(({ track } ) => track)) {
            if (track.$input && track.$input.prop('checked')) {
                return track.name
            }
        }

        return 'none'
    }

    async restoreSessionState(state) {
        const { trackViews } = this.browser
        const list = trackViews.map(({ track }) => track).filter(track => state === track.name)
        const track = list[ 0 ]
        track.$input.trigger('click.igv-panel-material-provider')
    }
}

const getMaterialProvider = async track => {

    // unselect other track's checkboxes
    for (let { track:otherTrack } of track.browser.trackViews) {
        if (otherTrack !== track && otherTrack.$input) {
            otherTrack.$input.prop('checked', false)
        }
    }

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
