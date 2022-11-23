import {AlertSingleton, EventBus} from 'igv-widgets'
import igv from './igv'
import SpacewalkEventBus from './spacewalkEventBus.js'
import { setMaterialProvider } from './utils.js';
import Panel from './panel.js';
import {colorRampMaterialProvider, ensembleManager} from './app.js'

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
            SpacewalkEventBus.globalBus.post({ type: 'DidEnterGenomicNavigator', data: 'DidEnterGenomicNavigator' });
        });

        this.$panel.on(`mouseleave.${ this.namespace }`, (event) => {
            event.stopPropagation();
            SpacewalkEventBus.globalBus.post({ type: 'DidLeaveGenomicNavigator', data: 'DidLeaveGenomicNavigator' });
        });

        SpacewalkEventBus.globalBus.subscribe("DidUpdateGenomicInterpolant", this);
        SpacewalkEventBus.globalBus.subscribe("DidChangeMaterialProvider", this)
    }

    getClassName(){ return 'IGVPanel' }

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

        }

    }

    async initialize({ igvConfig, session }) {

        this.browser = undefined;

        const root = this.$panel.find('#spacewalk_igv_root_container').get(0)

        try {
            if (session) {
                const { showTrackLabels, showRuler, showControls,showCursorTrackingGuide } = igvConfig
                const mergedConfig = { ...session, ...({ showTrackLabels, showRuler, showControls, showCursorTrackingGuide }) }
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

                        if (ensembleManager.genome) {
                            const { chr, genomicStart, genomicEnd } = ensembleManager.genome.locus
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

    async locusDidChange({ chr, genomicStart, genomicEnd }) {
        try {
            if ('all' === chr) {
                await this.browser.search(chr)
            } else {
                await this.browser.search(`${ chr }:${ genomicStart }-${ genomicEnd }`)
            }

        } catch (e) {
            AlertSingleton.present(e.message)
        }

    }

    configureMouseHandlers () {

        this.browser.on('trackremoved', track => {
            if (track.trackView.materialProviderInput && $(track.trackView.materialProviderInput).prop('checked')) {
                this.materialProvider = colorRampMaterialProvider
                setMaterialProvider(this.materialProvider)
            }
        })

        this.browser.columnContainer.addEventListener('mouseenter', event => {
            event.stopPropagation();
            SpacewalkEventBus.globalBus.post({ type: 'DidEnterGUI', data: this });
        })

        this.browser.columnContainer.addEventListener('mouseleave', event => {
            event.stopPropagation();
            SpacewalkEventBus.globalBus.post({ type: 'DidLeaveGUI', data: this });
        })

        this.browser.setCustomCursorGuideMouseHandler(({ bp, start, end, interpolant }) => {

            if (undefined === ensembleManager || undefined === ensembleManager.genome) {
                return;
            }

            const { genomicStart, genomicEnd } = ensembleManager.genome.locus;

            const xRejection = start > genomicEnd || end < genomicStart || bp < genomicStart || bp > genomicEnd;

            if (xRejection) {
                return;
            }

            SpacewalkEventBus.globalBus.post({ type: 'DidUpdateGenomicInterpolant', data: { poster: this, interpolantList: [ interpolant ] } });

        })

    }

    async loadTrackList(configurations) {

        let tracks = [];
        try {
            this.present()
            tracks = await this.browser.loadTrackList( configurations );
        } catch (e) {
            console.error(e.message)
            AlertSingleton.present(e.message);
        }

        for (let { trackView, config } of tracks) {
            trackView.setTrackLabelName(trackView, config.name);
        }

    }

    toJSON() {
        return this.browser.toJSON()
    }

    getSessionState() {

        for (let trackView of this.browser.trackViews) {
            if (trackView.materialProviderInput && $(trackView.materialProviderInput).prop('checked')) {
                return trackView.track.name
            }
        }

        return 'none'
    }

    async restoreSessionState(state) {

        const { trackViews } = this.browser
        const [ track ] = trackViews.map(({ track }) => track).filter(track => state === track.name)

        $(track.trackView.materialProviderInput).trigger('click.igv-panel-material-provider')
    }
}

export default IGVPanel
