import { globalEventBus } from "../eventBus.js";
import igv from '../../vendor/igv.esm.js';
import { makeDraggable } from "../draggable.js";
import { lerp } from "../math.js";
import { segmentIndexForInterpolant, moveOffScreen, moveOnScreen } from '../utils.js';
import { igvPanel } from '../gui.js';
import { noodle, ballAndStick, dataValueMaterialProvider, structureManager, sceneManager } from "../main.js";

let currentURL = undefined;
class IGVPanel {

    constructor ({ container, panel, isHidden }) {

        this.container = container;
        this.$panel = $(panel);
        this.isHidden = isHidden;

        if (isHidden) {
            moveOffScreen(this);
        } else {
            this.layout();
        }

        makeDraggable(panel, $(panel).find('.trace3d_card_drag_container').get(0));

        $(window).on('resize.window.trace3d.trace3d_igv_panel', () => { this.onWindowResize() });

        addResizeListener(panel, () => {

            if (this.browser) {
                this.browser.resize();
            }

        });

        this.$panel.on('mouseenter.trace3d.trace3d_igv_panel', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidEnterGUI" });
        });

        this.$panel.on('mouseleave.trace3d.trace3d_igv_panel', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidLeaveGUI" });
        });

        // URL
        const $url_input = $('#trace3d_igv_panel_url_input');
        $url_input.val('');

        const $url_button = $('#trace3d_igv_panel_url_button');

        $url_input.on('change.trace3d_igv_panel_url_input', (event) => {
            event.stopPropagation();
            // console.log('url on change - value ' + event.target.value);
            currentURL = event.target.value;
        });

        const $url_container = $('#trace3d_igv_container');

        $url_button.on('click.trace3d_igv_panel_url_button', async (event) => {
            event.stopPropagation();
            $url_input.trigger('change.trace3d_igv_panel_url_input');
            await this.loadURL({ url: currentURL, $spinner: $url_container.find('.spinner-border')});

            $url_input.val('');
            currentURL = undefined;
        });

        globalEventBus.subscribe("ToggleUIControl", this);
    }

    async receiveEvent({ type, data }) {

        if ("ToggleUIControl" === type && data && data.payload === this.$panel.attr('id')) {

            if (true === this.isHidden) {
                moveOnScreen(this);
                const { chr, start, end } = this.locus;
                await this.browser.goto(chr, start, end);
            } else {
                moveOffScreen(this);
            }

            this.isHidden = !this.isHidden;
        }
    }

    async createBrowser (config) {

        try {
            this.browser = await igv.createBrowser( this.$panel.find('#trace3d_igv_root_container').get(0), config );

            // TODO: Make less fragile
            const [ chr, se ] = config.locus[ 0 ].split(':');
            const [ start, end ] = se.split('-').map(str => parseInt(str, 10));

            this.locus = { chr, start, end };
            return this.browser;
        } catch (error) {
            console.warn(error.message);
            return undefined;
        }

    }

    async goto({ chr, start, end }) {
        this.locus = { chr, start, end };
        await this.browser.goto(chr, start, end);
    }

    async loadTrack(url) {

        try {
            const track = await igv.browser.loadTrack({ url });
            return track;
        } catch (error) {
            console.warn(error.message);
            return undefined;
        }

    }

    async loadURL({ url, $spinner }){

        url = url || '';

        if ('' !== url) {
            $spinner.show();
            let track = await this.loadTrack(url);
            $spinner.hide();
        }

    };

    async trackDataHandler (track) {

        if (track) {
            this.currentDataTrack = track;
        }

        if (this.currentDataTrack) {

            const { referenceFrame } = this.browser.genomicStateList[ 0 ];
            const { bpPerPixel } = referenceFrame;

            const { chr, start, end } = this.locus;
            const features = await this.currentDataTrack.getFeatures(chr, start, end, bpPerPixel);

            const { min, max } = this.currentDataTrack.dataRange;

            dataValueMaterialProvider.configure({ startBP: start, endBP: end, features, min, max });
        }

    };

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

    // Each segment "ball" is point in genomic space. Find features (genomic range) that overlap that point.
    async buildFeatureSegmentIndices({ chr, start, end, stepSize }) {

        this.featureSegmentIndices = new Set();

        const features = await this.track.getFeatures(chr, start, end, this.bpp);

        for (let feature of features) {

            const index = Math.floor((feature.start - start) / stepSize);

            const one_based = 1 + index;
            if(index >= 0) {
                this.featureSegmentIndices.add(one_based);
            }
        }

    }

}

export let IGVMouseHandler = ({ bp, start, end, interpolant, structureLength }) => {

    const { genomicStart, genomicEnd } = structureManager.locus;

    const xRejection = start > genomicEnd || end < genomicStart || bp < genomicStart || bp > genomicEnd;

    if (xRejection) {
        return;
    }

    let [ a, b ] = [ (start - genomicStart)/(genomicEnd - genomicStart), (end - genomicStart)/(genomicEnd - genomicStart) ];
    const segmentIndex = segmentIndexForInterpolant(lerp(a, b, interpolant), structureLength);

    globalEventBus.post({ type: 'DidSelectSegmentIndex', data: { interpolantList: [ interpolant ], segmentIndexList: [ segmentIndex ]} });
};

export let customIGVTrackHandler = async (track) => {

    await igvPanel.trackDataHandler(track);

    sceneManager.materialProvider = dataValueMaterialProvider;
    noodle.updateMaterialProvider(sceneManager.materialProvider);
    ballAndStick.updateMaterialProvider(sceneManager.materialProvider);

};

export default IGVPanel;
