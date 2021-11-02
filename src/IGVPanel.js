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

    }

    async loadTrackList(configurations) {

        let tracks = [];
        try {
            tracks = await this.browser.loadTrackList( configurations );
        } catch (e) {
            AlertSingleton.present(e.message);
        }

        for (let { trackView, config } of tracks) {
            trackView.setTrackLabelName(trackView, config.name);
        }

        this.present()
    }

    loadTrack(trackConfiguration) {
        this.loadTrackList([trackConfiguration]);
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

export default IGVPanel
