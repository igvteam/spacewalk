import igv from 'igv'
import SpacewalkEventBus from './spacewalkEventBus.js'
import {setMaterialProvider} from './utils/utils.js';
import Panel from './panel.js';
import { getPathsWithTrackRegistry, updateTrackMenusWithTrackConfigurations } from './widgets/trackWidgets.js'
import { spacewalkConfig } from "../spacewalk-config.js";

let resizeObserver
let resizeTimeout
const RESIZE_DEBOUNCE_DELAY = 200
class IGVPanel extends Panel {

    constructor ({ container, panel, isHidden, colorRampMaterialProvider, trackMaterialProvider, ensembleManager, genomicNavigator }) {

        const xFunction = (wc, wp) => {
            return (wc - wp)/2;
        };

        const yFunction = (hc, hp) => {
            return hc - (hp * 1.1);
        };

        super({ container, panel, isHidden, xFunction, yFunction })

        this.colorRampMaterialProvider = colorRampMaterialProvider;
        this.trackMaterialProvider = trackMaterialProvider;
        this.ensembleManager = ensembleManager;
        this.genomicNavigator = genomicNavigator;

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

                        if (this.ensembleManager.locus) {
                            console.log(`Panel resized to width: ${width}, height: ${height}`)
                            const { chr, genomicStart, genomicEnd } = this.ensembleManager.locus
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
            if (poster === this.genomicNavigator && interpolantList) {
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
                await this.deactivateTrackMaterialProvider(track);
            }
        });

        this.browser.on('trackremoved', track => {
            if (track.trackView.materialProviderInput?.checked) {
                this.removeTrackFromMaterialProvider(track);
            }
        });

        this.browser.setCustomCursorGuideMouseHandler(({ bp, start, end, interpolant }) => {

            if (undefined === this.ensembleManager || undefined === this.ensembleManager.locus) {
                return
            }

            const { genomicStart, genomicEnd } = this.ensembleManager.locus

            const xRejection = start > genomicEnd || end < genomicStart || bp < genomicStart || bp > genomicEnd;

            if (xRejection) {
                return;
            }

            SpacewalkEventBus.globalBus.post({ type: 'DidUpdateGenomicInterpolant', data: { poster: this, interpolantList: [ interpolant ] } });

        })

    }

    async activateTrackMaterialProvider(track) {
        // Check if track can be used (zoom level check)
        if (!this.canUseTrackForMaterial(track)) {
            console.warn(`Track ${track.name} zoom level too low. Cannot add to material provider.`);
            track.trackView.materialProviderInput.checked = false;
            return;
        }

        // Add this track to the material provider
        await this.trackMaterialProvider.configure(track);

        // Switch to track material provider if not already using it
        if (this.materialProvider !== this.trackMaterialProvider) {
            this.materialProvider = this.trackMaterialProvider;
        }

        // Always call setMaterialProvider to trigger repaint with updated colors
        setMaterialProvider(this.trackMaterialProvider);
        console.log(`Active tracks: ${this.trackMaterialProvider.getTrackNames().join(', ')}`);
    }

    async deactivateTrackMaterialProvider(track) {
        // Remove this track from the material provider
        this.removeTrackFromMaterialProvider(track);
    }

    removeTrackFromMaterialProvider(track) {
        this.trackMaterialProvider.removeTrackInstance(track);

        // If no tracks remain, switch back to color ramp provider
        if (this.trackMaterialProvider.getTrackNames().length === 0) {
            this.materialProvider = this.colorRampMaterialProvider;
            setMaterialProvider(this.colorRampMaterialProvider);
            console.log('No active tracks. Switched to color ramp provider.');
        } else {
            // Tracks remain - ensure we're using trackMaterialProvider and trigger repaint
            this.materialProvider = this.trackMaterialProvider;
            setMaterialProvider(this.trackMaterialProvider);
            console.log(`Active tracks: ${this.trackMaterialProvider.getTrackNames().join(', ')}`);
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
        const checkedTracks = [];

        for (let trackView of this.browser.trackViews) {
            if (trackView.materialProviderInput && trackView.materialProviderInput.checked) {
                checkedTracks.push(trackView.track.name);
            }
        }

        // Return array of checked track names, or 'none' if none checked
        return checkedTracks.length > 0 ? checkedTracks : 'none';
    }

    async restoreSessionState(state) {
        // Handle backward compatibility: if state is a string (old format), convert to array
        const trackNames = Array.isArray(state) ? state : (state === 'none' ? [] : [state]);

        if (trackNames.length === 0) {
            console.log('No tracks to restore for material provider');
            return;
        }

        console.log(`Restoring ${trackNames.length} tracks: ${trackNames.join(', ')}`);

        // Find and activate all tracks
        const tracksToRestore = this.browser.trackViews
            .map(({ track }) => track)
            .filter(track => trackNames.includes(track.name));

        if (tracksToRestore.length === 0) {
            console.warn('No matching tracks found for restoration');
            return;
        }

        // Check all tracks and add them to material provider
        for (const track of tracksToRestore) {
            if (track.trackView.loading === false) {
                console.warn(`Track ${track.name} is NOT loaded. Skipping.`);
                continue;
            }

            track.trackView.materialProviderInput.checked = true;
            await this.activateTrackMaterialProvider(track);
        }

        // Ensure final blended colors are applied
        if (tracksToRestore.length > 0) {
            this.materialProvider = this.trackMaterialProvider;
            setMaterialProvider(this.trackMaterialProvider);
        }

        console.log(`Successfully restored ${tracksToRestore.length} tracks`);
    }
}

export default IGVPanel
