import igv from 'igv'
import SpacewalkEventBus from './spacewalkEventBus.js'
import {setMaterialProvider} from './utils/utils.js';
import Panel from './panel.js';
import {colorRampMaterialProvider, dataValueMaterialProvider, ensembleManager, genomicNavigator} from './app.js'
import { getPathsWithTrackRegistry, updateTrackMenusWithTrackConfigurations } from './widgets/trackWidgets.js'
import { spacewalkConfig } from "../spacewalk-config.js";

let resizeObserver
let resizeTimeout
const RESIZE_DEBOUNCE_DELAY = 200
class IGVPanel extends Panel {

    constructor ({ container, panel, isHidden }) {

        const xFunction = (wc, wp) => {
            return (wc - wp)/2;
        };

        const yFunction = (hc, hp) => {
            return hc - (hp * 1.1);
        };

        super({ container, panel, isHidden, xFunction, yFunction })

        // const dragHandle = panel.querySelector('.spacewalk_card_drag_container')
        // makeDraggable(panel, dragHandle)

        this.panel.addEventListener('mouseenter', (event) => {
            event.stopPropagation();
            SpacewalkEventBus.globalBus.post({ type: 'DidEnterGenomicNavigator', data: 'DidEnterGenomicNavigator' });
        });

        this.panel.addEventListener('mouseleave', (event) => {
            event.stopPropagation();
            SpacewalkEventBus.globalBus.post({ type: 'DidLeaveGenomicNavigator', data: 'DidLeaveGenomicNavigator' });
        });

        SpacewalkEventBus.globalBus.subscribe("DidUpdateGenomicInterpolant", this)
    }

    async initialize(igvConfig) {

        igvConfig.listeners = {

            'genomechange': async ({genome, trackConfigurations}) => {

                let configs = await getPathsWithTrackRegistry(genome.id, spacewalkConfig.trackRegistry)

                if (undefined === configs) {
                    configs = trackConfigurations
                }

                if (configs) {
                    await updateTrackMenusWithTrackConfigurations(genome.id, undefined, configs, document.getElementById('spacewalk-track-dropdown-menu'))
                }
            }
        }

        this.browser = undefined

        const root = this.panel.querySelector('#spacewalk_igv_root_container')

        if (undefined === igvConfig.genomeList) {
            igvConfig.genomeList = [ ...spacewalkConfig.igvConfig.genomeList ]
        }
        try {
            const { browser, knownGenomes } = await igv.createBrowser( root, igvConfig )
            this.browser = browser
            this.knownGenomes = knownGenomes
        } catch (e) {
            console.error(e.message)
            alert(e.message)
        }

        if (this.browser) {
            this.configureMouseHandlers()
        }

        resizeObserver = new ResizeObserver(entries => {

            for (let entry of entries) {
                const DOMElement = entry.target;

                // Updated panel dimensions
                const { width, height } = entry.contentRect;

                if (resizeTimeout) {
                    clearTimeout(resizeTimeout)
                }

                // Set a new timeout to execute code after resizing has "stopped"
                resizeTimeout = setTimeout(() => {

                    const container = DOMElement.querySelector('#spacewalk_igv_container')

                    if (container) {
                        container.style.width = `${width}px`;
                        container.style.height = `${height}px`;

                        if (ensembleManager.locus) {
                            console.log(`Panel resized to width: ${width}, height: ${height}`)
                            const { chr, genomicStart, genomicEnd } = ensembleManager.locus
                            this.browser.search(`${ chr }:${ genomicStart }-${ genomicEnd }`)
                        }

                    } // if (container)

                }, RESIZE_DEBOUNCE_DELAY);

            }
        })

        resizeObserver.observe(this.panel)

    }

    getClassName(){ return 'IGVPanel' }

    receiveEvent({ type, data }) {

        super.receiveEvent({ type, data });

        if ("DidUpdateGenomicInterpolant" === type) {
            const { poster, interpolantList } = data
            if (poster === genomicNavigator && interpolantList) {
                this.browser.cursorGuide.updateWithInterpolant(interpolantList[ 0 ])
            }
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
            console.error(e.message)
            alert(e.message)
        }

    }

    configureMouseHandlers () {

        this.browser.on('dataValueMaterialCheckbox', async track => {
            console.log(`${track.name} checkbox changed to ${track.trackView.materialProviderInput.checked}`);
            
            if (track.trackView.materialProviderInput.checked) {
                await this.activateTrackMaterialProvider(track);
            } else {
                this.deactivateTrackMaterialProvider();
            }
        });

        this.browser.on('trackremoved', track => {
            if (track.trackView.materialProviderInput?.checked) {
                this.deactivateTrackMaterialProvider();
            }
        });

        this.browser.setCustomCursorGuideMouseHandler(({ bp, start, end, interpolant }) => {

            if (undefined === ensembleManager || undefined === ensembleManager.locus) {
                return
            }

            const { genomicStart, genomicEnd } = ensembleManager.locus

            const xRejection = start > genomicEnd || end < genomicStart || bp < genomicStart || bp > genomicEnd;

            if (xRejection) {
                return;
            }

            SpacewalkEventBus.globalBus.post({ type: 'DidUpdateGenomicInterpolant', data: { poster: this, interpolantList: [ interpolant ] } });

        })

    }

    async activateTrackMaterialProvider(track) {
        // Uncheck all other tracks
        this.uncheckOtherTracks(track);
        
        // Check if track can be used (zoom level check)
        if (!this.canUseTrackForMaterial(track)) {
            console.warn(`Track ${track.name} zoom level too low. Using default color ramp.`);
            track.trackView.materialProviderInput.checked = false;
            this.deactivateTrackMaterialProvider();
            return;
        }
        
        // Configure and apply
        await dataValueMaterialProvider.configure(track);
        this.materialProvider = dataValueMaterialProvider;
        setMaterialProvider(dataValueMaterialProvider);
    }

    deactivateTrackMaterialProvider() {
        this.materialProvider = colorRampMaterialProvider;
        setMaterialProvider(colorRampMaterialProvider);
    }

    uncheckOtherTracks(selectedTrack) {
        for (let trackView of this.browser.trackViews) {
            if (trackView.track !== selectedTrack && trackView.materialProviderInput) {
                trackView.materialProviderInput.checked = false;
            }
        }
    }

    canUseTrackForMaterial(track) {
        const zoomInNotice = track.trackView.viewports[0].$zoomInNotice.get(0);
        return !(zoomInNotice && zoomInNotice.style.display !== 'none');
    }

    async loadTrackList(configurations) {

        let tracks = [];
        try {
            this.present()
            tracks = await this.browser.loadTrackList( configurations );
        } catch (e) {
            console.error(e.message)
            alert(e.message)
        }

        for (let { trackView, config } of tracks) {
            trackView.setTrackLabelName(trackView, config.name);
        }

    }

    getSessionState() {

        for (let trackView of this.browser.trackViews) {
            if (trackView.materialProviderInput && trackView.materialProviderInput.checked) {
                return trackView.track.name
            }
        }

        return 'none'
    }

    async restoreSessionState(state) {

        const [ track ] = this.browser.trackViews.map(({ track }) => track).filter(track => state === track.name)

        if (false === track.trackView.loading) {
            console.warn(`Danger. track(${ track.name }) is NOT loaded. Can not use for feature mapping`)
        }

        track.trackView.materialProviderInput.checked = true
        await this.activateTrackMaterialProvider(track)

    }
}

export default IGVPanel
