/*
 *  The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 The Regents of the University of California
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the
 * following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
 * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,  FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

import {Alert} from 'igv-ui'
import {DOMUtils, FileUtils} from 'igv-utils'
import {InputDialog} from 'igv-ui'
import * as hicUtils from './hicUtils.js'
import {Globals} from "./globals.js";
import EventBus from "./eventBus.js";
import LayoutController, {getNavbarContainer, getNavbarHeight, trackHeight} from './layoutController.js'
import HICEvent from './hicEvent.js'
import Dataset from './hicDataset.js'
import State from './hicState.js'
import geneSearch from './geneSearch.js'
import LocusGoto from "./hicLocusGoto.js";
import ResolutionSelector from "./hicResolutionSelector.js";
import ColorScaleWidget from "./hicColorScaleWidget.js";
import ControlMapWidget from "./controlMapWidget.js";
import NormalizationWidget from "./normalizationWidget.js";
import ChromosomeSelectorWidget from "./chromosomeSelectorWidget.js";
import SweepZoom from "./sweepZoom.js";
import ScrollbarWidget from "./scrollbarWidget.js";
import ContactMatrixView from "./contactMatrixView.js";
import ColorScale, {defaultColorScaleConfig} from "./colorScale.js";
import RatioColorScale, {defaultRatioColorScaleConfig} from "./ratioColorScale.js";
import AnnotationWidget from './annotationWidget.js';
import Track2D from './track2D.js'
import {GenomeUtils} from '../genome/genomeUtils.js'

const DEFAULT_PIXEL_SIZE = 1
const MAX_PIXEL_SIZE = 12;
const DEFAULT_ANNOTATION_COLOR = "rgb(22, 129, 198)";

class HICBrowser {

    constructor($app_container, config) {

        this.config = config;
        this.figureMode = config.figureMode || config.miniMode;    // Mini mode for backward compatibility
        this.resolutionLocked = false;
        this.eventBus = new EventBus();

        this.showTrackLabelAndGutter = true;

        this.id = `browser_${DOMUtils.guid()}`;
        this.tracks2D = [];
        this.normVectorFiles = [];

        this.synchable = config.synchable !== false;
        this.synchedBrowsers = [];

        this.isMobile = hicUtils.isMobile();

        this.$root = $('<div class="hic-root unselect">');

        if (config.width) {
            this.$root.css("width", String(config.width));
        }
        if (config.height) {
            this.$root.css("height", String(config.height + getNavbarHeight()));
        }

        $app_container.append(this.$root);

        this.layoutController = new LayoutController(this, this.$root)

        // nav bar related objects
        this.locusGoto = new LocusGoto(this, getNavbarContainer(this));
        this.resolutionSelector = new ResolutionSelector(this, getNavbarContainer(this));
        this.resolutionSelector.setResolutionLock(this.resolutionLocked);
        this.colorscaleWidget = new ColorScaleWidget(this, getNavbarContainer(this));
        this.controlMapWidget = new ControlMapWidget(this, getNavbarContainer(this));
        this.normalizationSelector = new NormalizationWidget(this, getNavbarContainer(this));
        this.inputDialog = new InputDialog($app_container.get(0), this);

        // contact map container related objects
        const sweepZoom = new SweepZoom(this, this.layoutController.getContactMatrixViewport());
        const scrollbarWidget = new ScrollbarWidget(this, this.layoutController.getXAxisScrollbarContainer(), this.layoutController.getYAxisScrollbarContainer());

        const colorScale = new ColorScale(defaultColorScaleConfig);

        const ratioColorScale = new RatioColorScale(defaultRatioColorScaleConfig.threshold);
        ratioColorScale.setColorComponents(defaultRatioColorScaleConfig.negative, '-')
        ratioColorScale.setColorComponents(defaultRatioColorScaleConfig.positive, '+')
        const backgroundColor = config.backgroundColor || ContactMatrixView.defaultBackgroundColor
        this.contactMatrixView = new ContactMatrixView(this, this.layoutController.getContactMatrixViewport(), sweepZoom, scrollbarWidget, colorScale, ratioColorScale, backgroundColor);

        this.$menu = this.createMenu(this.$root);
        this.$menu.hide();

        this.chromosomeSelector = new ChromosomeSelectorWidget(this, this.$menu.find('.hic-chromosome-selector-widget-container'));

        const annotation2DWidgetConfig =
            {
                title: '2D Annotations',
                alertMessage: 'No 2D annotations currently loaded for this map'
            };

        this.annotation2DWidget = new AnnotationWidget(this, this.$menu.find(".hic-annotation-presentation-button-container"), annotation2DWidgetConfig, () => this.tracks2D);

        // prevent user interaction during lengthy data loads
        this.$user_interaction_shield = $('<div>', {class: 'hic-root-prevent-interaction'});
        this.$root.append(this.$user_interaction_shield);
        this.$user_interaction_shield.hide();

        this.hideCrosshairs();

    }

    async init(config) {

        this.state = config.state ? config.state : State.default(config)
        this.pending = new Map();
        this.contactMatrixView.disableUpdates = true;

        try {

            await this.loadHicFile(config);

            if (config.controlUrl) {
                const { controlUrl:url, controlName:name, controlNvi:nvi } = config
                await this.loadHicControlFile({ url, name, nvi, isControl: true })
            }

            if (config.displayMode) {
                this.contactMatrixView.displayMode = config.displayMode;
            }

            if (config.colorScale) {
                this.contactMatrixView.setColorScale(config.colorScale);
            }

            if(config.locus) {
                await this.parseLocusString(config.locus, false)
            }

            const promises = []
            if (config.tracks) {
                promises.push(this.loadTracks(config.tracks))
            }

            if (config.normVectorFiles) {
                for (let normVectorFile of config.normVectorFiles) {
                    promises.push(this.loadNormalizationFile(normVectorFile))
                }
            }

            if (promises.length > 0) {
                await Promise.all(promises)
            }

        } catch(e) {
            console.error(e)
            Alert.presentAlert(e)
        } finally {

            if (config.displayMode) {
                this.eventBus.post({type: "DisplayMode", data: config.displayMode})
            }

            if (config.colorScale) {
                this.eventBus.post({type: "ColorScale", data: this.contactMatrixView.getColorScale()})
            }

            this.contactMatrixView.stopSpinner();
            this.$user_interaction_shield.hide();
            this.contactMatrixView.disableUpdates = false

            // If a file was actually loaded, update
            if (this.dataset) {

                const eventConfig =
                    {
                        state: this.state,
                        resolutionChanged: true,
                        chrChanged: true
                    }

                await this.update(HICEvent('LocusChange', eventConfig))

            }

        }

    }

    /**
     * Load a .hic file
     *
     * NOTE: public API function
     *
     * @return a promise for a dataset
     * @param config
     */
    async loadHicFile(config) {

        if (undefined === config.url) {
            this.genome = GenomeUtils.currentGenome
            console.warn(`No .hic url specified. Genome set to ${ this.genome.id }`);
            return
        }

        this.contactMatrixView.startSpinner();
        this.$user_interaction_shield.show();

        this.reset()

        this.dataset = undefined
        this.controlDataset = undefined

        await this.contactMatrixView.setDisplayMode('A')

        try {

            this.contactMatrixView.startSpinner()
            this.$user_interaction_shield.show()

            const name = extractName(config)
            config.name = name;

            this.$contactMaplabel.text(`${ this.controlDataset ? "A: " : "" }${ name }`)
            this.$contactMaplabel.attr('title', name)

            this.dataset = await Dataset.loadDataset(config)

            this.genome = GenomeUtils.GenomeLibrary[ this.dataset.genomeId ]

            this.eventBus.post(HICEvent("MapLoad", this.dataset))

            if (!config.nvi && typeof config.url === "string") {

                const { hostname, pathname } = new URL(config.url)
                const key = encodeURIComponent(hostname + pathname)

                const str = `https://t5dvc6kn3f.execute-api.us-east-1.amazonaws.com/dev/nvi/${ key }`
                const nviResponse = await fetch(str)

                if (nviResponse.status === 200) {
                    const nvi = await nviResponse.text()
                    if (nvi) {
                        config.nvi = nvi
                    }
                }
            }

            if (config.nvi) {
                await this.dataset.getNormVectorIndex(config)
                this.eventBus.post(HICEvent("NormVectorIndexLoad", this.dataset));
            } else {
                await this.dataset.getNormVectorIndex(config)
                if (!config.isControl) {
                    this.eventBus.post(HICEvent("NormVectorIndexLoad", this.dataset));
                }
            }

        } catch (error) {
            this.contactMatrixView.stopSpinner()
            this.$contactMaplabel.text('');
            this.$contactMaplabel.attr('');
            throw error
        } finally {
            this.contactMatrixView.stopSpinner()
            this.$user_interaction_shield.hide()
        }
    }

    /**
     * Load a .hic file for a control map
     *
     * NOTE: public API function
     *
     * @return a promise for a dataset
     * @param config
     */
    async loadHicControlFile(config) {

        try {
            this.$user_interaction_shield.show()
            this.contactMatrixView.startSpinner()

            this.controlUrl = config.url

            config.name = extractName(config)

            const controlDataset = await Dataset.loadDataset(config)

            if (undefined === this.dataset || this.dataset.isCompatible(controlDataset)) {

                this.controlDataset = controlDataset

                if (this.dataset) {
                    this.$contactMaplabel.text("A: " + this.dataset.name);
                }

                this.$controlMaplabel.text("B: " + controlDataset.name);

                this.$controlMaplabel.attr('title', controlDataset.name);

                //For the control dataset, block until the norm vector index is loaded
                await controlDataset.getNormVectorIndex(config)
                this.eventBus.post(HICEvent("ControlMapLoad", this.controlDataset))

                await this.update()

            } else {
                Alert.presentAlert(`"B" map genome(${controlDataset.genomeId}) does not match "A" map genome(${this.genome.id})`)
            }

        } finally {
            this.$user_interaction_shield.hide()
            this.contactMatrixView.stopSpinner()
        }
    }

    async parseLocusString(locusString, doUpdate) {

        const locusResult = await this.getLocusPair(locusString, this.genome)

        if (undefined === locusResult) {
            Alert.presentAlert('Error parsing locus string')
        } else {

            const { xLocus, yLocus, gene } = locusResult

            if (gene) {
                Globals.selectedGene = gene
            }

            // bp-per-bin
            const { binSize } = this.getBinSizeList(this.dataset)[ this.state.zoom ]

            // pixel
            const { width, height } = this.contactMatrixView.getViewDimensions()


            // NOTE: We assume pixelSize === 1

            // treat start as centroid
            if (undefined === xLocus.end) {

                // bp = bp - (pixel * bp-per-bin)/2
                xLocus.start = Math.max(0, xLocus.start - Math.floor(width * binSize / 2))

                // bp = bp + (pixel * bp-per-bin)
                xLocus.end = xLocus.start + width * binSize;
            }

            // treat start as centroid
            if (undefined === yLocus.end) {

                // bp = bp - (pixel * bp-per-bin)/2
                yLocus.start = Math.max(0, yLocus.start - Math.floor(height * binSize / 2));

                // bp = bp + (pixel * bp-per-bin)
                yLocus.end = yLocus.start + height * binSize;
            }

            await this.setStateWithLoci(this.state, xLocus, yLocus)

            if (true === doUpdate) {

                const eventConfig =
                    {
                        state: this.state,
                        resolutionChanged: true,
                        chrChanged: true
                    }

                await this.update(HICEvent('LocusChange', eventConfig))

            }

        }

    }

    async getLocusPair(locusString, genome) {

        let xLocus
        let yLocus

        const loci = locusString.split(' ')

        if (1 === loci.length) {
            xLocus = this.getLocusPairHelper(loci[0])
            yLocus = Object.assign({}, xLocus)
        } else {

            xLocus = this.getLocusPairHelper(loci[0])
            yLocus = this.getLocusPairHelper(loci[1])

            if (undefined === yLocus) {
                yLocus = Object.assign({}, xLocus)
            }
        }

        if (undefined === xLocus) {

            const gene = loci[0].trim()
            const result = await geneSearch(genome.id, gene)

            if (result) {
                xLocus = this.getLocusPairHelper(result)
                yLocus = Object.assign({}, xLocus)

                return { xLocus, yLocus, gene }
            } else {
                console.error(`No feature found with name ${ gene }`)
                return undefined
            }

        }

        return { xLocus, yLocus }

    }

    getLocusPairHelper(locusString) {

        const locusObject = {};
        const parts = locusString.trim().split(':');
        const chromosome = this.genome.getChromosome(parts[0].toLowerCase());

        if (!chromosome) {
            return undefined;
        } else {
            locusObject.chr = chromosome.index;
        }

        if (parts.length === 1) {
            // Chromosome name only
            locusObject.start = 0;
            locusObject.end = chromosome.size;

            locusObject.wholeChr = true;
        } else {
            const extent = parts[1].split("-");
            let numeric = extent[0].replace(/\,/g, '');
            locusObject.start = isNaN(numeric) ? undefined : parseInt(numeric, 10) - 1;
            if (extent.length === 2) {
                numeric = extent[1].replace(/\,/g, '');
                locusObject.end = isNaN(numeric) ? undefined : parseInt(numeric, 10);
            }
        }

        return locusObject;
    }

    async setStateWithLoci(state, xLocus, yLocus) {

        if (xLocus.wholeChr && yLocus.wholeChr) {

            state.zoom = await this.minZoom(xLocus.chr, yLocus.chr);

            state.chr1 = Math.min(xLocus.chr, yLocus.chr)
            state.chr2 = Math.max(xLocus.chr, yLocus.chr)

            state.x = 0
            state.y = 0

            const minimumPixelSize = await this.getMinimumPixelSize(state.chr1, state.chr2, state.zoom)
            state.pixelSize = Math.min(100, Math.max(DEFAULT_PIXEL_SIZE, minimumPixelSize))

        } else {

            // pixel
            const { width, height } = this.contactMatrixView.getViewDimensions()

            // bp-per-bin
            const targetBinSize = Math.max((xLocus.end - xLocus.start) / width, (yLocus.end - yLocus.start) / height)

            // bp-per-bin list
            const binSizeList = this.getBinSizeList(this.dataset)

            state.chr1 = xLocus.chr
            state.chr2 = yLocus.chr

            const newZoomIndex = this.findNearestZoomIndexForTargetBinSize(targetBinSize, binSizeList)
            state.zoom = newZoomIndex

            // bp-per-bin
            const { binSize } = binSizeList[newZoomIndex]

            // bin = bp / bp-per-bin
            state.x = xLocus.start / binSize
            state.y = yLocus.start / binSize

            // bp-per-bin
            state.pixelSize = Math.min(MAX_PIXEL_SIZE, Math.max(1, binSize / targetBinSize))

        }

    }

    async goto(chr1, startXBP, endXBP, chr2, startYBP, endYBP) {

        await this.setStateWithLoci(this.state, { chr:chr1, start:startXBP, end: endXBP }, { chr:chr2, start:startYBP, end: endYBP })

        const eventConfig =
            {
                state: this.state,
                resolutionChanged: true,
                chrChanged: true
            }

        await this.update(HICEvent('LocusChange', eventConfig))

    }

    /**
     * Zoom and center on bins at given screen coordinates.  Supports double-click zoom, pinch zoom.
     * @param direction
     * @param centerPX  screen coordinate to center on
     * @param centerPY  screen coordinate to center on
     * @returns {Promise<void>}
     */
    async zoomAndCenter(direction, centerPX, centerPY) {

        if (this.genome.isWholeGenome(this.state.chr1) && direction > 0) {

            //              bp = pixel * bp/bin * bin/pixel
            //              bp = bp
            const xBP = centerPX * this.dataset.wholeGenomeResolution / this.state.pixelSize;
            const yBP = centerPY * this.dataset.wholeGenomeResolution / this.state.pixelSize;

            const chrX = this.genome.getChromosomeForCoordinate(xBP);
            const chrY = this.genome.getChromosomeForCoordinate(yBP);

            await this.parseLocusString(`${chrX.name} ${chrY.name}`, true)

        } else {

            // bp-per-bin list
            const binSizeList = this.getBinSizeList(this.dataset)

            // pixel
            const { width, height } = this.contactMatrixView.getViewDimensions()

            // pixel
            const dx = centerPX === undefined ? 0 : centerPX - width / 2
            const dy = centerPY === undefined ? 0 : centerPY - height / 2

            // bin += pixel / pixel-per-bin
            // bin += bin
            this.state.x += (dx / this.state.pixelSize)
            this.state.y += (dy / this.state.pixelSize)

            if (this.resolutionLocked ||
                (direction > 0 && this.state.zoom === binSizeList[binSizeList.length - 1].index) ||
                (direction < 0 && this.state.zoom === binSizeList[0].index)) {

                const minPS = await this.getMinimumPixelSize(this.state.chr1, this.state.chr2, this.state.zoom)
                const state = this.state;
                const newPixelSize = Math.max(Math.min(MAX_PIXEL_SIZE, state.pixelSize * (direction > 0 ? 2 : 0.5)), minPS);

                const shiftRatio = (newPixelSize - state.pixelSize) / newPixelSize;
                state.pixelSize = newPixelSize;
                state.x += shiftRatio * (viewDimensions.width / state.pixelSize);
                state.y += shiftRatio * (viewDimensions.height / state.pixelSize);

                this.clamp();

                this.update( HICEvent("LocusChange", { state, resolutionChanged: false, chrChanged: false }) );

            } else {
                let i;
                for (i = 0; i < binSizeList.length; i++) {
                    if (this.state.zoom === binSizeList[i].index) break;
                }

                if (i) {
                    const newZoom = binSizeList[i + direction].index;
                    this.setZoom(newZoom);
                }
            }
        }

    }

    /**
     * Set the current zoom state and opctionally center over supplied coordinates.
     * @param zoom - index to the datasets resolution array (dataset.bpResolutions)
     * @returns {Promise<void>}
     */
    async setZoom(zoom) {

        const bpResolutions = this.dataset.bpResolutions;
        const currentResolution = bpResolutions[this.state.zoom];
        const viewDimensions = this.contactMatrixView.getViewDimensions();
        const xCenter = this.state.x + viewDimensions.width / (2 * this.state.pixelSize);    // center in bins
        const yCenter = this.state.y + viewDimensions.height / (2 * this.state.pixelSize);    // center in bins

        const newResolution = bpResolutions[zoom];
        const newXCenter = xCenter * (currentResolution / newResolution);
        const newYCenter = yCenter * (currentResolution / newResolution);
        const minPS = await this.getMinimumPixelSize(this.state.chr1, this.state.chr2, zoom)
        const state = this.state;
        const newPixelSize = Math.max(DEFAULT_PIXEL_SIZE, minPS);
        const zoomChanged = (state.zoom !== zoom);

        state.zoom = zoom;
        state.x = Math.max(0, newXCenter - viewDimensions.width / (2 * newPixelSize));
        state.y = Math.max(0, newYCenter - viewDimensions.height / (2 * newPixelSize));
        state.pixelSize = newPixelSize;
        this.clamp();

        await this.contactMatrixView.zoomIn()

        await this.update( HICEvent("LocusChange", { state, resolutionChanged: zoomChanged, chrChanged: false }) )

    }

    /**
     * Find the closest matching zoom index (index into the dataset resolutions array) for the target resolution.
     *
     * binSizes can be either
     *   (1) an array of binSizes
     *   (2) an array of objects with index and binSize
     * @param targetBinSize
     * @param binSizes
     * @returns {number}
     */
    findNearestZoomIndexForTargetBinSize(targetBinSize, binSizes) {

        const isObject = binSizes.length > 0 && binSizes[0].index !== undefined;

        for (let i = binSizes.length - 1; i > 0; i--) {

            const binSize = isObject ? binSizes[i].binSize : binSizes[i];

            const zoomIndex = isObject ? binSizes[ i ].index : i;

            if (binSize >= targetBinSize) {
                return zoomIndex;
            }

        }

        return 0;
    }

    async minZoom(chr1, chr2) {

        // bp
        const { name:name1, size:chr1Length } = this.genome.getChromosomeAtIndex(chr1)
        const { name:name2, size:chr2Length } = this.genome.getChromosomeAtIndex(chr2)

        // pixel
        const { width, height } = this.contactMatrixView.getViewDimensions()

        //         bp =                        bp / pixel
        const binSize = Math.max(chr1Length / width, chr2Length / height)

        const matrix = await this.dataset.getMatrix(chr1, chr2)
        if (!matrix) {
            throw new Error(`Data not avaiable for chromosomes ${ name1} - ${name2}`);
        }
        return matrix.findZoomForResolution(binSize, undefined);
    }

    async getMinimumPixelSize(chr1, chr2, zoomIndex) {

        // bp
        const { size:chr1Length } = this.genome.getChromosomeAtIndex(chr1)
        const { size:chr2Length } = this.genome.getChromosomeAtIndex(chr2)

        const matrix = await this.dataset.getMatrix(chr1, chr2)
        const { zoom } = matrix.getZoomDataByIndex(zoomIndex, "BP")

        //    unit-less = bp / bp
        const binCount1 = chr1Length / zoom.binSize
        const binCount2 = chr2Length / zoom.binSize

        // pixel
        const { width, height } = this.contactMatrixView.getViewDimensions()

        // pixel-per-bin = pixel / bin-count
        return Math.min(width / binCount1, height / binCount2)

    }

    /**
     * Update the maps and tracks.  This method can be called from the browser event thread repeatedly, for example
     * while mouse dragging.  If called while an update is in progress queue the event for processing later.  It
     * is only necessary to queue the most recent recently received event, so a simple instance variable will suffice
     * for the queue.
     *
     * @param event
     */
    async update(event) {

        if (this.updating) {
            const type = event ? event.type : "NONE";
            this.pending.set(type, event);
        } else {
            this.updating = true;
            try {

                this.contactMatrixView.startSpinner()

                if (event && "LocusChange" === event.type) {
                    this.layoutController.xAxisRuler.locusChange(event);
                    this.layoutController.yAxisRuler.locusChange(event);
                }

                await this.contactMatrixView.update(event)

            } finally {

                this.updating = false

                if (this.pending.size > 0) {

                    const events = []
                    for (let [k, v] of this.pending) {
                        events.push(v);
                    }

                    this.pending.clear();

                    for (let e of events) {
                        this.update(e)
                    }
                }

                if (event) {
                    // possibly, unless update was called from an event post (infinite loop)
                    this.eventBus.post(event)
                }

                this.contactMatrixView.stopSpinner()
            }
        }
    }

    repaintMatrix() {
        this.contactMatrixView.imageTileCache = {};
        this.contactMatrixView.initialImage = undefined;
        this.contactMatrixView.update();
    }

    /**
     * Load a list of 1D genome tracks (wig, etc).
     *
     * NOTE: public API function
     *
     * @param configs
     */
    async loadTracks(configs) {

        // If loading a single track remember its name, for error message
        const errorPrefix = 1 === configs.length ? ("Error loading track " + configs[0].name) : "Error loading tracks";

        try {
            this.contactMatrixView.startSpinner()

            const promises = [];

            for (let config of configs) {

                if ("annotation" === config.type && config.color === DEFAULT_ANNOTATION_COLOR) {
                    delete config.color;
                }

                if (config.max === undefined) {
                    config.autoscale = true;
                }

                config.height = trackHeight;

                if (undefined === config.format || "bedpe" === config.format || "interact" === config.format) {
                    // Assume this is a 2D track
                    promises.push(Track2D.loadTrack2D(config, this.genome))
                }
            }

            if (promises.length > 0) {

                const tracks2D = await Promise.all(promises)
                if (tracks2D && tracks2D.length > 0) {
                    this.tracks2D = this.tracks2D.concat(tracks2D);
                }

            }

        } catch (error) {
            this.contactMatrixView.stopSpinner()
            presentError(errorPrefix, error)
            console.error(error)

        } finally {
            this.contactMatrixView.stopSpinner()
        }
    }

    createMenu($root) {

        const html =
            `<div class="hic-menu" style="display: none;">
            <div class="hic-menu-close-button">
                <i class="fa fa-times"></i>
            </div>
	        <div class="hic-chromosome-selector-widget-container">
		        <div>Chromosomes</div>
                <div>
                    <select name="x-axis-selector"></select>
                    <select name="y-axis-selector"></select>
                    <div></div>
                </div>
	        </div>
	        <div class="hic-annotation-presentation-button-container">
		        <button type="button">2D Annotations</button>
	        </div>
        </div>`;

        $root.append($(html));

        const $menu = $root.find(".hic-menu");

        const $fa = $root.find(".fa-times");
        $fa.on('click', () => this.toggleMenu());

        return $menu;

    }

    toggleMenu() {
        if (this.$menu.is(':visible')) {
            this.hideMenu();
        } else {
            this.showMenu();
        }
    }

    showMenu() {
        this.$menu.show();
    }

    hideMenu() {
        this.$menu.hide();
    }

    async getNormalizationOptions() {

        if (!this.dataset) return [];

        const baseOptions = await this.dataset.getNormalizationOptions();
        if (this.controlDataset) {
            let controlOptions = await this.controlDataset.getNormalizationOptions();
            controlOptions = new Set(controlOptions);
            return baseOptions.filter(base => controlOptions.has(base));
        } else {
            return baseOptions;
        }
    }

    /**
     * Return usable resolutions, that is the union of resolutions between dataset and controlDataset.
     * @returns {{index: *, binSize: *}[]|Array}
     */
    getBinSizeList(dataset) {

        if (undefined === dataset) {
            return []
        }

        const baseResolutions = dataset.bpResolutions.map((resolution, index) => { return { index, binSize: resolution } })

        if (this.controlDataset) {
            const controlResolutions = new Set(this.controlDataset.bpResolutions)
            return baseResolutions.filter(base => controlResolutions.has(base.binSize))
        } else {
            return baseResolutions
        }
    }

    isWholeGenome() {
        return this.state && this.genome && this.genome.isWholeGenome(this.state.chr1)
    }

    updateCrosshairs({x, y, xNormalized, yNormalized}) {

        const xGuide = y < 0 ? {left: 0} : {top: y, left: 0};
        this.contactMatrixView.$x_guide.css(xGuide);
        this.layoutController.$x_track_guide.css(xGuide);

        const yGuide = x < 0 ? {top: 0} : {top: 0, left: x};
        this.contactMatrixView.$y_guide.css(yGuide);
        this.layoutController.$y_track_guide.css(yGuide);

        if (this.customCrosshairsHandler) {

            const {x: stateX, y: stateY, pixelSize} = this.state;
            const resolution = this.dataset.bpResolutions[ this.state.zoom ]

            const xBP = (stateX + (x / pixelSize)) * resolution;
            const yBP = (stateY + (y / pixelSize)) * resolution;

            let {startBP: startXBP, endBP: endXBP} = this.getGenomicState('x');
            let {startBP: startYBP, endBP: endYBP} = this.getGenomicState('y');

            this.customCrosshairsHandler({
                xBP,
                yBP,
                startXBP,
                startYBP,
                endXBP,
                endYBP,
                interpolantX: xNormalized,
                interpolantY: yNormalized
            });
        }

    }

    setCustomCrosshairsHandler(crosshairsHandler) {
        this.customCrosshairsHandler = crosshairsHandler;
    }

    hideCrosshairs() {

        this.contactMatrixView.$x_guide.hide();
        this.layoutController.$x_track_guide.hide();

        this.contactMatrixView.$y_guide.hide();
        this.layoutController.$y_track_guide.hide();

    }

    showCrosshairs() {

        this.contactMatrixView.$x_guide.show();
        this.layoutController.$x_track_guide.show();

        this.contactMatrixView.$y_guide.show();
        this.layoutController.$y_track_guide.show();
    }

    getGenomicState(axis) {

        let width = this.contactMatrixView.getViewDimensions().width
        let resolution = this.dataset.bpResolutions[this.state.zoom];
        const bpp =
            (this.genome.getChromosomeAtIndex(this.state.chr1).name.toLowerCase() === "all") ?
                this.genome.getGenomeLength() / width :
                resolution / this.state.pixelSize

        const genomicState =
            {
                bpp
            };

        if (axis === "x") {
            genomicState.chromosome = this.genome.getChromosomeAtIndex(this.state.chr1)
            genomicState.startBP = this.state.x * resolution;
            genomicState.endBP = genomicState.startBP + bpp * width;
        } else {
            genomicState.chromosome = this.genome.getChromosomeAtIndex(this.state.chr2)
            genomicState.startBP = this.state.y * resolution;
            genomicState.endBP = genomicState.startBP + bpp * this.contactMatrixView.getViewDimensions().height;
        }
        return genomicState;
    }

    async loadNormalizationFile(url) {

        if (!this.dataset) return;
        this.eventBus.post(HICEvent("NormalizationFileLoad", "start"));

        const normVectors = await this.dataset.hicFile.readNormalizationVectorFile(url, this.dataset.chromosomes)
        for (let type of normVectors['types']) {
            if (!this.dataset.normalizationTypes) {
                this.dataset.normalizationTypes = [];
            }
            if (!this.dataset.normalizationTypes.includes(type)) {
                this.dataset.normalizationTypes.push(type);
            }
            this.eventBus.post(HICEvent("NormVectorIndexLoad", this.dataset));
        }

        return normVectors;
    }

    reset() {

        this.$contactMaplabel.text("");
        this.$contactMaplabel.attr('title', "");

        this.$controlMaplabel.text("");
        this.$controlMaplabel.attr('title', "")

        this.tracks2D = []

        if (this.contactMatrixView) this.contactMatrixView.clearImageCaches()

        this.dataset = undefined
        this.controlDataset = undefined
    }

    setNormalization(normalization) {

        this.state.normalization = normalization;
        this.eventBus.post(HICEvent("NormalizationChange", this.state.normalization))
    }

    shiftPixels(dx, dy) {

        if (!this.dataset) return;
        this.state.x += (dx / this.state.pixelSize);
        this.state.y += (dy / this.state.pixelSize);
        this.clamp();

        const locusChangeEvent = HICEvent("LocusChange", {
            state: this.state,
            resolutionChanged: false,
            dragging: true,
            chrChanged: false
        });
        locusChangeEvent.dragging = true;

        this.update(locusChangeEvent);
        this.eventBus.post(locusChangeEvent);
    }

    clamp() {
        var viewDimensions = this.contactMatrixView.getViewDimensions(),
            chr1Length = this.genome.getChromosomeAtIndex(this.state.chr1).size,
            chr2Length = this.genome.getChromosomeAtIndex(this.state.chr2).size,
            binSize = this.dataset.bpResolutions[this.state.zoom],
            maxX = (chr1Length / binSize) - (viewDimensions.width / this.state.pixelSize),
            maxY = (chr2Length / binSize) - (viewDimensions.height / this.state.pixelSize);

        // Negative maxX, maxY indicates pixelSize is not enough to fill view.  In this case we clamp x, y to 0,0
        maxX = Math.max(0, maxX);
        maxY = Math.max(0, maxY);


        this.state.x = Math.min(Math.max(0, this.state.x), maxX);
        this.state.y = Math.min(Math.max(0, this.state.y), maxY);
    }

    toJSON() {

        if (!(this.dataset && this.dataset.url)) return "{}";   // URL is required

        const jsonOBJ = {};

        jsonOBJ.backgroundColor = this.contactMatrixView.stringifyBackgroundColor()
        jsonOBJ.url = this.dataset.url;
        if (this.dataset.name) {
            jsonOBJ.name = this.dataset.name;
        }
        jsonOBJ.state = this.state.stringify();
        jsonOBJ.colorScale = this.contactMatrixView.getColorScale().stringify();
        if (Globals.selectedGene) {
            jsonOBJ.selectedGene = Globals.selectedGene;
        }
        let nviString = getNviString(this.dataset);
        if (nviString) {
            jsonOBJ.nvi = nviString;
        }
        if (this.controlDataset) {
            jsonOBJ.controlUrl = this.controlUrl;
            if (this.controlDataset.name) {
                jsonOBJ.controlName = this.controlDataset.name;
            }

            const displayMode = this.contactMatrixView ? this.contactMatrixView.displayMode : undefined

            if (displayMode) {
                jsonOBJ.displayMode = this.contactMatrixView.displayMode
            }

            nviString = getNviString(this.controlDataset);
            if (nviString) {
                jsonOBJ.controlNvi = nviString;
            }
            if (this.controlMapWidget.getDisplayModeCycle() !== undefined) {
                jsonOBJ.cycle = true;
            }
        }

        if (this.tracks2D.length > 0) {

            const tracks = [];
            jsonOBJ.tracks = tracks;
            for (let track of this.tracks2D) {
                var config = track.config;
                if (typeof config.url === "string") {
                    const t = {
                        url: config.url
                    }
                    if (track.name) {
                        t.name = track.name;
                    }
                    if (track.color) {
                        t.color = track.color;
                    }
                    tracks.push(t);
                }
            }
        }

        return jsonOBJ;
    }

}

function extractName(config) {
    if (config.name === undefined) {
        const urlOrFile = config.url;
        if (FileUtils.isFilePath(urlOrFile)) {
            return urlOrFile.name;
        } else {
            const str = urlOrFile.split('?').shift();
            const idx = urlOrFile.lastIndexOf("/");
            return idx > 0 ? str.substring(idx + 1) : str;
        }
    } else {
        return config.name;
    }
}

function getNviString(dataset) {

    return dataset.hicFile.config.nvi
    // if (dataset.hicFile.normalizationVectorIndexRange) {
    //     var range = dataset.hicFile.normalizationVectorIndexRange,
    //         nviString = String(range.start) + "," + String(range.size);
    //     return nviString
    // } else {
    //     return undefined;
    // }
}

// parseUri 1.2.2
// (c) Steven Levithan <stevenlevithan.com>
// MIT License

function parseUri(str) {
    var o = parseUri.options,
        m = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
        uri = {},
        i = 14;

    while (i--) uri[o.key[i]] = m[i] || "";

    uri[o.q.name] = {};
    uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
        if ($1) uri[o.q.name][$1] = $2;
    });

    return uri;
}

parseUri.options = {
    strictMode: false,
    key: ["source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor"],
    q: {
        name: "queryKey",
        parser: /(?:^|&)([^&=]*)=?([^&]*)/g
    },
    parser: {
        strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
        loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
    }
};

function replaceAll(str, target, replacement) {
    return str.split(target).join(replacement);
}

function presentError(prefix, error) {
    const httpMessages = {
        "401": "Access unauthorized",
        "403": "Access forbidden",
        "404": "Not found"
    }
    var msg = error.message;
    if (httpMessages.hasOwnProperty(msg)) {
        msg = httpMessages[msg];
    }
    Alert.presentAlert(prefix + ": " + msg);

}

export default HICBrowser

