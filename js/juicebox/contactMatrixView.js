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

/**
 * @author Jim Robinson
 */

import {Alert} from "igv-ui"
import {IGVColor} from 'igv-utils'
import ColorScale from './colorScale.js'
import HICEvent from './hicEvent.js'

const DRAG_THRESHOLD = 2;

const imageTileDimension = 685;

class ContactMatrixView {

    constructor(browser, $viewport, sweepZoom, scrollbarWidget, colorScale, ratioColorScale, backgroundColor) {

        this.browser = browser;
        this.$viewport = $viewport;
        this.sweepZoom = sweepZoom;

        // Set initial color scales.  These might be overriden / adjusted via parameters
        this.colorScale = colorScale;

        this.ratioColorScale = ratioColorScale;
        // this.diffColorScale = new RatioColorScale(100, false);

        this.backgroundColor = backgroundColor;
        this.backgroundRGBString = IGVColor.rgbColor(backgroundColor.r, backgroundColor.g, backgroundColor.b)

        this.$canvas = $viewport.find('canvas');
        this.ctx = this.$canvas.get(0).getContext('2d');

        this.$fa_spinner = $viewport.find('.fa-spinner');
        this.spinnerCount = 0;

        this.$x_guide = $viewport.find("div[id$='-x-guide']");
        this.$y_guide = $viewport.find("div[id$='-y-guide']");

        this.displayMode = 'A';
        this.imageTileCache = {};
        this.imageTileCacheKeys = [];
        this.imageTileCacheLimit = 8; //8 is the minimum number required to support A/B cycling
        this.colorScaleThresholdCache = {};


        this.browser.eventBus.subscribe("NormalizationChange", this);
        this.browser.eventBus.subscribe("TrackState2D", this);
        this.browser.eventBus.subscribe("MapLoad", this)
        this.browser.eventBus.subscribe("ControlMapLoad", this);
        this.browser.eventBus.subscribe("ColorChange", this)

        this.drawsInProgress = new Set()
    }

    async receiveEvent(event) {

        if ("MapLoad" === event.type || "ControlMapLoad" === event.type) {

            // Don't enable mouse actions until we have a dataset.
            if (!this.mouseHandlersEnabled) {
                this.addMouseHandlers(this.$viewport);
                this.mouseHandlersEnabled = true;
            }
            this.clearImageCaches();
            this.colorScaleThresholdCache = {};
        } else {
            if (!("LocusChange" === event.type)) {
                this.clearImageCaches();
            }
            await this.update();
        }
    }

    async update() {

        if (this.disableUpdates) return   // This flag is set during browser startup

        await this.repaint()

    }

    async repaint() {

        if (!this.browser.dataset) {
            return;
        }

        const { width, height } = this.$viewport.get(0).getBoundingClientRect()

        this.$canvas.width(width)
        this.$canvas.attr('width', width)

        this.$canvas.height(height);
        this.$canvas.attr('height', height)

        const { dataset, datasetControl } = getDatasetPairWithDisplayMode(this.browser, this.displayMode)

        const { x:xBin, y:yBin, chr1, chr2, pixelSize } = this.browser.state

        const matrix = await dataset.getMatrix(chr1, chr2)

        const { zoomIndexA, zoomIndexB } = ContactMatrixView.getZoomIndex(this.browser.state.zoom, this.displayMode,this.browser.dataset, this.browser.controlDataset)
        const zoomData = matrix.getZoomDataByIndex(zoomIndexA, 'BP')

        let zoomDataControl;
        if (datasetControl) {
            const matrixControl = await datasetControl.getMatrix(chr1, chr2)
            zoomDataControl = matrixControl.getZoomDataByIndex(zoomIndexB, 'BP')
        }

        if ("NONE" !== this.browser.state.normalization) {

            const status = await dataset.hasNormalizationVector(this.browser.state.normalization, zoomData.chr1.name, zoomData.zoom.unit, zoomData.zoom.binSize)

            if (!status) {
                Alert.presentAlert("Normalization option " + this.browser.state.normalization + " unavailable at this resolution.")

                this.browser.eventBus.post(new HICEvent("NormalizationExternalChange", "NONE"))

                this.browser.state.normalization = "NONE";
            }
        }

        const columnStart = Math.floor(xBin / imageTileDimension)
        const    rowStart = Math.floor(yBin / imageTileDimension)

        const  widthBin =  width / Math.max(1, Math.floor(pixelSize))
        const heightBin = height / Math.max(1, Math.floor(pixelSize))

        const columnEnd = Math.floor((xBin +  widthBin) / imageTileDimension)
        const    rowEnd = Math.floor((yBin + heightBin) / imageTileDimension)

        await this.checkColorScale(dataset, zoomData, rowStart, rowEnd, columnStart, columnEnd, this.browser.state.normalization)

        this.ctx.clearRect(0, 0, width, height)
        this.ctx.fillStyle = this.backgroundRGBString

        for (let r = rowStart; r <= rowEnd; r++) {

            for (let c = columnStart; c <= columnEnd; c++) {

                const { image, row, column, blockBinCount } = await this.getImageTile(dataset, datasetControl, zoomData, zoomDataControl, r, c, this.browser.state.normalization)

                if (image) {
                    paintTile(this.ctx, this.backgroundRGBString, image, row, column, blockBinCount, width, height, xBin, yBin, pixelSize)
                }
            }

        }

        this.genomicExtent = ContactMatrixView.getGenomicExtent(this.browser.state, matrix, this.browser.dataset, this.browser.controlDataset, this.displayMode, this.getViewDimensions())
    }

    /**
     * This is where the image tile is actually drawn, if not in the cache
     *
     * @param dataset
     * @param datasetControl
     * @param zoomData
     * @param zoomDataControl
     * @param row
     * @param column
     * @param normalization
     * @returns {Promise<{image: HTMLCanvasElement, column: *, row: *, blockBinCount}|{image, inProgress: boolean, column: *, row: *, blockBinCount}|*>}
     */
    async getImageTile(dataset, datasetControl, zoomData, zoomDataControl, row, column, normalization) {

        const key = `${zoomData.chr1.name}_${zoomData.chr2.name}_${zoomData.zoom.binSize}_${zoomData.zoom.unit}_${row}_${column}_${normalization}_${this.displayMode}`

        if (this.imageTileCache.hasOwnProperty(key)) {
            return this.imageTileCache[key]
        }

        if (this.drawsInProgress.has(key)) {
            const image = inProgressTile(imageTileDimension)
            return { row, column, blockBinCount: imageTileDimension, image, inProgress: true }
        }

        this.drawsInProgress.add(key)

        try {
            this.startSpinner()

            const sizeBP = imageTileDimension * zoomData.zoom.binSize

            const xStartBP = column * sizeBP
            const yStartBP =    row * sizeBP

            const { contactRecords, contactRecordsControl } = await getContactRecords(dataset, datasetControl, normalization, xStartBP, yStartBP, sizeBP, zoomData, zoomDataControl)

            const sameChr = zoomData.chr1.index === zoomData.chr2.index
            const transpose = sameChr && row < column

            const image = document.createElement('canvas');
            image.width = imageTileDimension;
            image.height = imageTileDimension;
            const ctx = image.getContext('2d');

            if (contactRecords.length > 0) {

                const averageCount = zoomData.averageCount
                const averageCountControl = zoomDataControl ? zoomDataControl.averageCount : 1
                const averageCountAcrossMapAndControl = (averageCount + averageCountControl) / 2

                const imageData = ctx.getImageData(0, 0, image.width, image.height);

                let controlRecords = {}
                if ('AOB' === this.displayMode || 'BOA' === this.displayMode || 'AMB' === this.displayMode) {
                    for (let contactRecordControl of contactRecordsControl) {
                        controlRecords[ contactRecordControl.getKey() ] = contactRecordControl
                    }
                }

                const xBin = transpose ? row * imageTileDimension : column * imageTileDimension
                const yBin = transpose ? column * imageTileDimension : row * imageTileDimension

                for (let contactRecord of contactRecords) {

                    let x = Math.floor((contactRecord.bin1 - xBin))
                    let y = Math.floor((contactRecord.bin2 - yBin))

                    if (transpose) {
                        const t = y;
                        y = x;
                        x = t;
                    }

                    const rgba = this.getRGBAWithDisplayMode(this.displayMode, contactRecord, controlRecords, averageCount, averageCountControl, averageCountAcrossMapAndControl)

                    if (rgba) {
                        setPixel(imageData, x, y, rgba.red, rgba.green, rgba.blue, rgba.alpha)
                        if (sameChr && row === column) {
                            setPixel(imageData, y, x, rgba.red, rgba.green, rgba.blue, rgba.alpha)
                        }
                    }
                }

                ctx.putImageData(imageData, 0, 0)
            }

            renderTracks2D(ctx, row, column, xStartBP, yStartBP, zoomData, this.browser.tracks2D, image.width, image.height, sameChr, transpose)

            const imageTile = { row, column, blockBinCount: imageTileDimension, image }

            if (this.imageTileCacheLimit > 0) {
                if (this.imageTileCacheKeys.length > this.imageTileCacheLimit) {
                    delete this.imageTileCache[this.imageTileCacheKeys[0]]
                    this.imageTileCacheKeys.shift()
                }
                this.imageTileCache[key] = imageTile

            }

            return imageTile;

        } finally {
            this.drawsInProgress.delete(key)
            this.stopSpinner()
        }

    }

    getRGBAWithDisplayMode(displayMode, contactRecord, controlRecords, averageCount, averageCountControl, averageCountAcrossMapAndControl) {

        let controlRecord
        let key
        let score
        switch (displayMode) {

            case 'AOB':
            case 'BOA':

                key = contactRecord.getKey();
                controlRecord = controlRecords[key];

                if (controlRecord) {
                    score = (contactRecord.counts / averageCount) / (controlRecord.counts / averageCountControl)
                    return this.ratioColorScale.getColor(score)
                } else {
                    return undefined
                }

            case 'AMB':

                key = contactRecord.getKey();
                controlRecord = controlRecords[key];

                if (controlRecord) {
                    score = averageCountAcrossMapAndControl * ((contactRecord.counts / averageCount) - (controlRecord.counts / averageCountControl))
                    return this.diffColorScale.getColor(score)
                } else {
                    return undefined
                }

            default:
                // displayMode is either 'A' or 'B'
                return this.colorScale.getColor(contactRecord.counts)
        }
    }

    async zoomIn() {

        const { chr1, chr2 } = this.browser.state

        const promises = []
        if ('B' === this.displayMode && this.browser.controlDataset) {
            promises.push(this.browser.controlDataset.getMatrix(chr1, chr2));
        } else {
            promises.push(this.browser.dataset.getMatrix(chr1, chr2));
            if (this.displayMode && 'A' !== this.displayMode && this.browser.controlDataset) {
                promises.push(this.browser.controlDataset.getMatrix(chr1, chr2));
            }
        }

        const matrices = await Promise.all(promises)

        const matrix = matrices[0]

        if (matrix) {

            const zoomedGenomicExtent = ContactMatrixView.getGenomicExtent(this.browser.state, matrix, this.browser.dataset, this.browser.controlDataset, this.displayMode, this.$viewport.get(0).getBoundingClientRect())

            const { width, height } = this.$viewport.get(0).getBoundingClientRect()

            // const zoomData = await matrix.getZoomDataByIndex(zoom, 'BP');
            // const __newGenomicExtent =
            //     {
            //         x: x * zoomData.zoom.binSize,
            //         y: y * zoomData.zoom.binSize,
            //         w:  width * zoomData.zoom.binSize / pixelSize,
            //         h: height * zoomData.zoom.binSize / pixelSize
            //     }

            // Zoom out not supported
            if (zoomedGenomicExtent.w > this.genomicExtent.w) {
                return
            }

            const sx = ((zoomedGenomicExtent.x - this.genomicExtent.x) / this.genomicExtent.w) * width
            const sy = ((zoomedGenomicExtent.y - this.genomicExtent.y) / this.genomicExtent.w) * height

            const sWidth = (zoomedGenomicExtent.w / this.genomicExtent.w) * width
            const sHeight = (zoomedGenomicExtent.h / this.genomicExtent.h) * height

            const img = this.$canvas.get(0)

            const backCanvas = document.createElement('canvas')
            backCanvas.width = img.width;
            backCanvas.height = img.height;

            const backCtx = backCanvas.getContext('2d')

            backCtx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, width, height)

            this.ctx.clearRect(0, 0, width, height)
            this.ctx.drawImage(backCanvas, 0, 0)
        }
    }

    /**
     * Return a promise to adjust the color scale, if needed.  This function might need to load the contact
     * data to computer scale.
     *
     * @param ds
     * @param zd
     * @param row1
     * @param row2
     * @param col1
     * @param col2
     * @param normalization
     * @returns {*}
     */
    async checkColorScale(ds, zd, row1, row2, col1, col2, normalization) {

        const colorKey = colorScaleKey(this.browser.state, this.displayMode);   // This doesn't feel right, state should be an argument
        if ('AOB' === this.displayMode || 'BOA' === this.displayMode) {
            return this.ratioColorScale;     // Don't adjust color scale for A/B.
        }

        if (this.colorScaleThresholdCache[colorKey]) {
            const changed = this.colorScale.threshold !== this.colorScaleThresholdCache[colorKey];
            this.colorScale.setThreshold(this.colorScaleThresholdCache[colorKey]);
            if (changed) {
                this.browser.eventBus.post(HICEvent("ColorScale", this.colorScale));
            }
            return this.colorScale;
        } else {
            try {
                const widthInBP = imageTileDimension * zd.zoom.binSize;
                const x0bp = col1 * widthInBP;
                const xWidthInBP = (col2 - col1 + 1) * widthInBP;
                const region1 = {chr: zd.chr1.name, start: x0bp, end: x0bp + xWidthInBP};
                const y0bp = row1 * widthInBP;
                const yWidthInBp = (row2 - row1 + 1) * widthInBP;
                const region2 = {chr: zd.chr2.name, start: y0bp, end: y0bp + yWidthInBp};
                const records = await ds.getContactRecords(normalization, region1, region2, zd.zoom.unit, zd.zoom.binSize, true);

                let s = computePercentile(records, 95);
                if (!isNaN(s)) {  // Can return NaN if all blocks are empty
                    if (0 === zd.chr1.index) s *= 4;   // Heuristic for whole genome view
                    this.colorScale = new ColorScale(this.colorScale);
                    this.colorScale.setThreshold(s);
                    this.computeColorScale = false;
                    this.browser.eventBus.post(HICEvent("ColorScale", this.colorScale));
                    this.colorScaleThresholdCache[colorKey] = s;
                }

                return this.colorScale;
            } finally {
                this.stopSpinner()
            }


        }

    }

    startSpinner() {

        if (true === this.browser.isLoadingHICFile && this.browser.$user_interaction_shield) {
            this.browser.$user_interaction_shield.show();
        }
        this.$fa_spinner.css("display", "inline-block");
        this.spinnerCount++
    }

    stopSpinner() {

        this.spinnerCount--
        if (0 === this.spinnerCount) {
            this.$fa_spinner.css("display", "none")
        }
        this.spinnerCount = Math.max(0, this.spinnerCount)
    }

    setBackgroundColor(rgb) {
        this.backgroundColor = rgb
        this.backgroundRGBString = IGVColor.rgbColor(rgb.r, rgb.g, rgb.b)
        this.repaint()
    }

    stringifyBackgroundColor() {
        return `${this.backgroundColor.r},${this.backgroundColor.g},${this.backgroundColor.b}`;
    }

    setColorScale(colorScale) {

        switch (this.displayMode) {
            case 'AOB':
            case 'BOA':
                this.ratioColorScale = colorScale;
                break;
            case 'AMB':
                this.diffColorScale = colorScale;
                break;
            default:
                this.colorScale = colorScale;
        }
        this.colorScaleThresholdCache[colorScaleKey(this.browser.state, this.displayMode)] = colorScale.threshold;
    }

    async setColorScaleThreshold(threshold) {
        this.getColorScale().setThreshold(threshold);
        this.colorScaleThresholdCache[colorScaleKey(this.browser.state, this.displayMode)] = threshold;
        this.imageTileCache = {};
        await this.update()

        return threshold
    }

    getColorScale() {
        switch (this.displayMode) {
            case 'AOB':
            case 'BOA':
                return this.ratioColorScale;
            case 'AMB':
                return this.diffColorScale;
            default:
                return this.colorScale;
        }
    }

    async setDisplayMode(mode) {
        this.displayMode = mode;
        this.clearImageCaches();
        await this.update();
        this.browser.eventBus.post(HICEvent("DisplayMode", mode))
    }

    getDisplayMode() {
        return this.displayMode
    }

    clearImageCaches() {
        this.imageTileCache = {};
        this.imageTileCacheKeys = [];
    }

    getViewDimensions() {
        const { width, height } = this.$viewport.get(0).getBoundingClientRect()
        return { width, height }
    }

    addMouseHandlers($viewport) {

        let isMouseDown = false;
        let isSweepZooming = false;
        let mouseDown;
        let mouseLast;
        let mouseOver;

        const panMouseUpOrMouseOut = (e) => {
            if (true === this.isDragging) {
                this.isDragging = false;
                this.browser.eventBus.post(HICEvent("DragStopped"));
            }
            isMouseDown = false;
            mouseDown = mouseLast = undefined;
        }

        this.isDragging = false;

        if (!this.browser.isMobile) {

            $viewport.dblclick((e) => {

                e.preventDefault();
                e.stopPropagation();

                if (this.browser.dataset) {
                    const mouseX = e.offsetX || e.layerX
                    const mouseY = e.offsetY || e.layerX;
                    this.browser.zoomAndCenter(1, mouseX, mouseY);
                }
            });

            $viewport.on('mouseover', (e) => mouseOver = true)

            $viewport.on('mouseout', (e) => mouseOver = undefined)

            $viewport.on('mousedown', (e) => {

                e.preventDefault();
                e.stopPropagation();

                if (this.browser.$menu.is(':visible')) {
                    this.browser.hideMenu();
                }

                mouseLast = {x: e.offsetX, y: e.offsetY};
                mouseDown = {x: e.offsetX, y: e.offsetY};

                isSweepZooming = (true === e.altKey);
                if (isSweepZooming) {
                    const eFixed = $.event.fix(e);
                    this.sweepZoom.initialize({x: eFixed.pageX, y: eFixed.pageY});
                }

                isMouseDown = true;

            })

            $viewport.on('mousemove', (e) => {

                e.preventDefault();
                e.stopPropagation();
                const coords =
                    {
                        x: e.offsetX,
                        y: e.offsetY
                    };

                // Sets pageX and pageY for browsers that don't support them
                const eFixed = $.event.fix(e);

                const xy =
                    {
                        x: eFixed.pageX - $viewport.offset().left,
                        y: eFixed.pageY - $viewport.offset().top
                    };

                const {width, height} = $viewport.get(0).getBoundingClientRect();
                xy.xNormalized = xy.x / width;
                xy.yNormalized = xy.y / height;


                this.browser.eventBus.post(HICEvent("UpdateContactMapMousePosition", xy, false));

                if (true === this.willShowCrosshairs) {
                    this.browser.updateCrosshairs(xy);
                    this.browser.showCrosshairs();
                }

                if (isMouseDown) { // Possibly dragging

                    if (isSweepZooming) {
                        this.sweepZoom.update({x: eFixed.pageX, y: eFixed.pageY});

                    } else if (mouseDown.x && Math.abs(coords.x - mouseDown.x) > DRAG_THRESHOLD) {

                        this.isDragging = true;
                        const dx = mouseLast.x - coords.x;
                        const dy = mouseLast.y - coords.y;

                        this.browser.shiftPixels(dx, dy);
                    }

                    mouseLast = coords;
                }
            })

            $viewport.on('mouseup', panMouseUpOrMouseOut)

            $viewport.on('mouseleave', () => {
                this.browser.layoutController.xAxisRuler.unhighlightWholeChromosome();
                this.browser.layoutController.yAxisRuler.unhighlightWholeChromosome();
                panMouseUpOrMouseOut();
            })


            // Mousewheel events -- ie exposes event only via addEventListener, no onwheel attribute
            // NOte from spec -- trackpads commonly map pinch to mousewheel + ctrl
            // $viewport[0].addEventListener("wheel", mouseWheelHandler, 250, false);

            // document level events
            $(document).on('keydown.contact_matrix_view', (e) => {
                if (undefined === this.willShowCrosshairs && true === mouseOver && true === e.shiftKey) {
                    this.willShowCrosshairs = true;
                    this.browser.eventBus.post(HICEvent('DidShowCrosshairs', 'DidShowCrosshairs', false));
                }
            })

            $(document).on('keyup.contact_matrix_view', (e) => {
                this.browser.hideCrosshairs();
                this.willShowCrosshairs = undefined;
                this.browser.eventBus.post(HICEvent('DidHideCrosshairs', 'DidHideCrosshairs', false));
            })

            // for sweep-zoom allow user to sweep beyond viewport extent
            // sweep area clamps since viewport mouse handlers stop firing
            // when the viewport boundary is crossed.
            $(document).on('mouseup.contact_matrix_view', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isSweepZooming) {
                    isSweepZooming = false;
                    this.sweepZoom.commit();
                }
            })
        }
    }

    static parseBackgroundColor(rgbString) {
        const [r, g, b] = rgbString.split(",").map(str => parseInt(str))
        return {r, g, b}
    }

    static getGenomicExtent(state, matrix, dataset, controlDataset, displayMode, viewDimensions) {

        let { zoomIndexA, zoomIndexB } = ContactMatrixView.getZoomIndex(state.zoom, displayMode, dataset, controlDataset)

        const { x, y, chr1, chr2, pixelSize } = state

        const zoomData = matrix.getZoomDataByIndex(zoomIndexA, 'BP');

        return {
            chr1,
            chr2,
            x: x * zoomData.zoom.binSize,
            y: y * zoomData.zoom.binSize,
            w:   viewDimensions.width * zoomData.zoom.binSize / pixelSize,
            h:  viewDimensions.height * zoomData.zoom.binSize / pixelSize
        }

    }

    static getZoomIndex(zoomIndex, displayMode, dataset, controlDataset) {

        const getBZoomIndex = (zoom, dataset, controlDataset) => {

            const binSize = dataset.getBinSizeForZoomIndex(zoom)

            if (!binSize) {
                console.error(`getZoomIndex: Invalid zoom index ${ zoom }`)
            }

            const bZoom = controlDataset.getZoomIndexForBinSize(binSize)

            if (bZoom < 0) {
                console.error(`getZoomIndex: Invalid binSize for "B" map: ${ binSize }`)
            }

            return bZoom
        }

        switch (displayMode) {
            case 'A':
                return { zoomIndexA: zoomIndex }
            case 'B':
                return { zoomIndexA: getBZoomIndex(zoomIndex, dataset, controlDataset) }
            case 'AOB':
            case 'AMB':
                return { zoomIndexA: zoomIndex, zoomIndexB: getBZoomIndex(zoomIndex, dataset, controlDataset) }
            case 'BOA':
                return { zoomIndexA: getBZoomIndex(zoomIndex, dataset, controlDataset), zoomIndexB: zoomIndex }
        }

    }

}

ContactMatrixView.defaultBackgroundColor = {r: 255, g: 255, b: 255}

async function getContactRecords(dataset, datasetControl, normalization, xStartBP, yStartBP, sizeBP, zoomData, zoomDataControl) {

    const geometricRegionX = { chr: zoomData.chr1.name, start: xStartBP, end: xStartBP + sizeBP }

    const geometricRegionY = { chr: zoomData.chr2.name, start: yStartBP, end: yStartBP + sizeBP }

    const contactRecords = await dataset.getContactRecords(normalization, geometricRegionX, geometricRegionY, zoomData.zoom.unit, zoomData.zoom.binSize);

    if (zoomDataControl) {
        const contactRecordsControl = await datasetControl.getContactRecords(normalization, geometricRegionX, geometricRegionY, zoomDataControl.zoom.unit, zoomDataControl.zoom.binSize)
        return { contactRecords, contactRecordsControl }
    } else {
        return { contactRecords }
    }

}

function paintTile(ctx, backgroundRGBString, image, row, column, blockBinCount, viewportWidth, viewportHeight, xBin, yBin, pixelSize) {

    const x0 = blockBinCount * column
    const y0 = blockBinCount * row

    const offsetX = (x0 - xBin) * pixelSize
    const offsetY = (y0 - yBin) * pixelSize

    const  scaledWidth = image.width  * pixelSize
    const scaledHeight = image.height * pixelSize

    if (offsetX <= viewportWidth && offsetX + scaledWidth >= 0 && offsetY <= viewportHeight && offsetY + scaledHeight >= 0) {

        ctx.fillStyle = backgroundRGBString
        ctx.fillRect(offsetX, offsetY, scaledWidth, scaledHeight)

        if (pixelSize === 1) {
            ctx.drawImage(image, offsetX, offsetY)
        } else {
            ctx.drawImage(image, offsetX, offsetY, scaledWidth, scaledHeight)
        }
    }
}

function renderTracks2D(ctx, row, column, xStartBP, yStartBP, zoomData, tracks2D, imageWidth, imageHeight, sameChr, transpose) {

    ctx.save()

    ctx.lineWidth = 2

    const chr1Name = zoomData.chr1.name
    const chr2Name = zoomData.chr2.name

    const size = Math.max(imageWidth, imageHeight)

    for (let track2D of tracks2D) {

        if (track2D.isVisible) {

            const features = track2D.getFeatures(chr1Name, chr2Name)

            if (features) {

                for (let { chr1, x1, x2, y1, y2, color } of features) {

                    // Chr name order
                    const flip = chr1Name !== chr1;

                    const fx1 = transpose || flip ? y1 : x1;
                    const fx2 = transpose || flip ? y2 : x2;
                    const fy1 = transpose || flip ? x1 : y1;
                    const fy2 = transpose || flip ? x2 : y2;

                    let px1 = (fx1 - xStartBP) / zoomData.zoom.binSize;
                    let px2 = (fx2 - xStartBP) / zoomData.zoom.binSize;

                    let py1 = (fy1 - yStartBP) / zoomData.zoom.binSize;
                    let py2 = (fy2 - yStartBP) / zoomData.zoom.binSize;

                    let w = px2 - px1;
                    let h = py2 - py1;

                    if (px2 > 0 && px1 < size && py2 > 0 && py1 < size) {

                        ctx.strokeStyle = track2D.color ? track2D.color : color
                        ctx.strokeRect(px1, py1, w, h)

                        if (sameChr && row === column) {
                            ctx.strokeRect(py1, px1, h, w);
                        }
                    }
                }
            }
        }
    }

    ctx.restore()

}

function setPixel(imageData, x, y, r, g, b, a) {
    const index = (x + y * imageData.width) * 4;
    imageData.data[index + 0] = r;
    imageData.data[index + 1] = g;
    imageData.data[index + 2] = b;
    imageData.data[index + 3] = a;
}

function getDatasetPairWithDisplayMode(browser, displayMode) {

    switch (displayMode) {
        case 'A':
            return { dataset:browser.dataset }
        case 'B':
            return { dataset:browser.controlDataset }
        case 'AOB':
        case 'AMB':
            return { dataset:browser.dataset, datasetControl:browser.controlDataset }
        case 'BOA':
            return { dataset:browser.controlDataset, datasetControl:browser.dataset }
    }

}

function colorScaleKey(state, displayMode) {
    return "" + state.chr1 + "_" + state.chr2 + "_" + state.zoom + "_" + state.normalization + "_" + displayMode;
}

const inProgressCache = {}

function inProgressTile(imageSize) {

    let image = inProgressCache[imageSize]
    if (!image) {
        image = document.createElement('canvas');
        image.width = imageSize;
        image.height = imageSize;
        const ctx = image.getContext('2d');
        ctx.font = '24px sans-serif';
        ctx.fillStyle = 'rgb(230, 230, 230)'
        ctx.fillRect(0, 0, image.width, image.height)
        ctx.fillStyle = 'black'
        for (let i = 100; i < imageSize; i += 300) {
            for (let j = 100; j < imageSize; j += 300) {
                ctx.fillText('Loading...', i, j);
            }
        }
        inProgressCache[imageSize] = image
    }
    return image;
}

function computePercentile(records, p) {
    const counts = records.map(r => r.counts)
    counts.sort(function (a, b) {
        return a - b;
    })
    const idx = Math.floor((p / 100) * records.length);
    return counts[idx];

    // return HICMath.percentile(array, p);
}

export default ContactMatrixView
