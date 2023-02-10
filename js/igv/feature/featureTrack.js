/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import FeatureSource from './featureSource.js';
import TrackBase from "../trackBase.js";
import IGVGraphics from "../igv-canvas.js";
import {createCheckbox} from "../igv-icons.js";
import {reverseComplementSequence} from "../util/sequenceUtils.js";
import {calculateFeatureCoordinates, getFeatureLabelY} from "./render/renderFeature.js";
import {renderSnp} from "./render/renderSnp.js";
import {renderFusionJuncSpan} from "./render/renderFusionJunction.js";
import {IGVColor, StringUtils} from "igv-utils";
import {ColorTable, PaletteColorTable} from "../util/colorPalletes.js";
import GtexUtils from "../gtex/gtexUtils";


class FeatureTrack extends TrackBase {

    constructor(config, browser) {
        super(config, browser);
    }

    init(config) {
        super.init(config);

        this.type = config.type || "annotation";

        // Set maxRows -- protects against pathological feature packing cases (# of rows of overlapping feaures)
        this.maxRows = config.maxRows === undefined ? 1000 : config.maxRows;

        this.displayMode = config.displayMode || "EXPANDED";    // COLLAPSED | EXPANDED | SQUISHED
        this.labelDisplayMode = config.labelDisplayMode;

        if (config._featureSource) {
            this.featureSource = config._featureSource;
            delete config._featureSource;
        } else {
            this.featureSource = config.featureSource ?
                config.featureSource :
                FeatureSource(config, this.browser.genome);
        }

        // Set default heights
        this.autoHeight = config.autoHeight;
        this.margin = config.margin === undefined ? 10 : config.margin;

        this.featureHeight = config.featureHeight || 14;

        if ("FusionJuncSpan" === config.type) {
            this.render = config.render || renderFusionJuncSpan
            this.squishedRowHeight = config.squishedRowHeight || 50;
            this.expandedRowHeight = config.expandedRowHeight || 50;
            this.height = config.height || this.margin + 2 * this.expandedRowHeight;
        } else if ('snp' === config.type) {
            this.render = config.render || renderSnp;
            // colors ordered based on priority least to greatest
            this.snpColors = ['rgb(0,0,0)', 'rgb(0,0,255)', 'rgb(0,255,0)', 'rgb(255,0,0)'];
            this.colorBy = 'function';
            this.expandedRowHeight = config.expandedRowHeight || 10;
            this.squishedRowHeight = config.squishedRowHeight || 5;
            this.height = config.height || 30;
        } else {
            // this.render = config.render || renderFeature;
            this.arrowSpacing = 30;
            // adjust label positions to make sure they're always visible
            monitorTrackDrag(this);
            this.squishedRowHeight = config.squishedRowHeight || 15;
            this.expandedRowHeight = config.expandedRowHeight || 30;
            this.height = config.height || this.margin + 2 * this.expandedRowHeight;

            // Set colorBy fields considering legacy options for backward compatibility
            if (config.colorBy) {
                if (config.colorBy.field) {
                    config.colorTable = config.colorBy.pallete || config.colorBy.palette;
                    config.colorBy = config.colorBy.field;
               }
                this.colorBy = config.colorBy;   // Can be undefined => default
                if (config.colorTable) {
                    this.colorTable = new ColorTable(config.colorTable);
                } else {
                    this.colorTable = new PaletteColorTable("Set1");
                }
            }
        }

        //UCSC useScore option
        this.useScore = config.useScore;
    }

    async postInit() {

        if (typeof this.featureSource.getHeader === "function") {
            this.header = await this.featureSource.getHeader();
        }

        // Set properties from track line
        if (this.header) {
            this.setTrackProperties(this.header)
        }

        if (this.visibilityWindow === undefined && typeof this.featureSource.defaultVisibilityWindow === 'function') {
            this.visibilityWindow = await this.featureSource.defaultVisibilityWindow();
            this.featureSource.visibilityWindow = this.visibilityWindow;   // <- this looks odd
        }

        return this;

    }

    supportsWholeGenome() {
        return (this.config.indexed === false || !this.config.indexURL) && this.config.supportsWholeGenome !== false
    }

    async getFeatures(chr, start, end, bpPerPixel) {
        const visibilityWindow = this.visibilityWindow;
        return this.featureSource.getFeatures({chr, start, end, bpPerPixel, visibilityWindow});
    };

    render(feature, bpStart, xScale, pixelHeight, ctx, options) {

        ctx.save();

        // Set ctx color to a known valid color.  If getColorForFeature returns an invalid color string it is ignored, and
        // this default will be used.
        ctx.fillStyle = this.defaultColor;
        ctx.strokeStyle = this.defaultColor;

        const color = this.getColorForFeature(feature)
        ctx.fillStyle = color;
        ctx.strokeStyle = color;

        let h;
        let py;
        if (this.displayMode === "SQUISHED" && feature.row !== undefined) {
            h = this.featureHeight / 2;
            py = this.margin + this.squishedRowHeight * feature.row;
        } else if (this.displayMode === "EXPANDED" && feature.row !== undefined) {
            h = this.featureHeight
            py = this.margin + this.expandedRowHeight * feature.row;
        } else {  // collapsed
            h = this.featureHeight;
            py = this.margin;
        }

        const cy = py + h / 2;
        const h2 = h / 2;
        const py2 = cy - h2 / 2;

        const exonCount = feature.exons ? feature.exons.length : 0;
        const coord = calculateFeatureCoordinates(feature, bpStart, xScale);
        const step = this.arrowSpacing;
        const direction = feature.strand === '+' ? 1 : feature.strand === '-' ? -1 : 0;

        if (exonCount === 0) {
            // single-exon transcript
            ctx.fillRect(coord.px, py, coord.pw, h);

            // Arrows
            // Do not draw if strand is not +/-
            if (direction !== 0) {
                ctx.fillStyle = "white";
                ctx.strokeStyle = "white";
                for (let x = coord.px + step / 2; x < coord.px1; x += step) {
                    // draw arrowheads along central line indicating transcribed orientation
                    IGVGraphics.strokeLine(ctx, x - direction * 2, cy - 2, x, cy);
                    IGVGraphics.strokeLine(ctx, x - direction * 2, cy + 2, x, cy);
                }
                ctx.fillStyle = color;
                ctx.strokeStyle = color;
            }
        } else {
            // multi-exon transcript
            IGVGraphics.strokeLine(ctx, coord.px + 1, cy, coord.px1 - 1, cy); // center line for introns

            const pixelWidth = options.pixelWidth;

            const xLeft = Math.max(0, coord.px) + step / 2;
            const xRight = Math.min(pixelWidth, coord.px1);
            for (let x = xLeft; x < xRight; x += step) {
                // draw arrowheads along central line indicating transcribed orientation
                IGVGraphics.strokeLine(ctx, x - direction * 2, cy - 2, x, cy);
                IGVGraphics.strokeLine(ctx, x - direction * 2, cy + 2, x, cy);
            }
            for (let e = 0; e < exonCount; e++) {
                // draw the exons
                const exon = feature.exons[e];
                let ePx = Math.round((exon.start - bpStart) / xScale);
                let ePx1 = Math.round((exon.end - bpStart) / xScale);
                let ePw = Math.max(1, ePx1 - ePx);
                let ePxU;

                if (ePx + ePw < 0) {
                    continue;  // Off the left edge
                }
                if (ePx > pixelWidth) {
                    break; // Off the right edge
                }

                if (exon.utr) {
                    ctx.fillRect(ePx, py2, ePw, h2); // Entire exon is UTR
                } else {
                    if (exon.cdStart) {
                        ePxU = Math.round((exon.cdStart - bpStart) / xScale);
                        ctx.fillRect(ePx, py2, ePxU - ePx, h2); // start is UTR
                        ePw -= (ePxU - ePx);
                        ePx = ePxU;

                    }
                    if (exon.cdEnd) {
                        ePxU = Math.round((exon.cdEnd - bpStart) / xScale);
                        ctx.fillRect(ePxU, py2, ePx1 - ePxU, h2); // start is UTR
                        ePw -= (ePx1 - ePxU);
                        ePx1 = ePxU;
                    }

                    ePw = Math.max(ePw, 1);
                    ctx.fillRect(ePx, py, ePw, h);

                    // Arrows
                    if (ePw > step + 5 && direction !== 0) {
                        ctx.fillStyle = "white";
                        ctx.strokeStyle = "white";
                        for (let x = ePx + step / 2; x < ePx1; x += step) {
                            // draw arrowheads along central line indicating transcribed orientation
                            IGVGraphics.strokeLine(ctx, x - direction * 2, cy - 2, x, cy);
                            IGVGraphics.strokeLine(ctx, x - direction * 2, cy + 2, x, cy);
                        }
                        ctx.fillStyle = color;
                        ctx.strokeStyle = color;

                    }
                }
            }
        }

        if (options.drawLabel && this.displayMode !== "SQUISHED") {
            this.renderFeatureLabel(ctx, feature, coord.px, coord.px1, py, options.referenceFrame, options);
        }

        ctx.restore();
    }

    getColorForFeature(feature) {

        let color;
        if (this.altColor && "-" === feature.strand) {
            color = (typeof this.altColor === "function") ? this.altColor(feature) : this.altColor;
        } else if (this.color) {
            color = (typeof this.color === "function") ? this.color(feature) : this.color;  // Explicit setting via menu, or possibly track line if !config.color
        } else if (this.colorBy) {
            const value = feature.getAttributeValue ?
                feature.getAttributeValue(this.colorBy) :
                feature[this.colorBy];
            color = this.colorTable.getColor(value);
        } else if (feature.color) {
            color = feature.color;   // Explicit color for feature
        } else {
            color = this.defaultColor;   // Track default
        }

        if (feature.alpha && feature.alpha !== 1) {
            color = IGVColor.addAlpha(color, feature.alpha);
        } else if (this.useScore && feature.score && !Number.isNaN(feature.score)) {
            // UCSC useScore option, for scores between 0-1000.  See https://genome.ucsc.edu/goldenPath/help/customTrack.html#TRACK
            const min = this.config.min ? this.config.min : 0; //getViewLimitMin(track);
            const max = this.config.max ? this.config.max : 1000; //getViewLimitMax(track);
            const alpha = getAlpha(min, max, feature.score);
            feature.alpha = alpha;    // Avoid computing again
            color = IGVColor.addAlpha(color, alpha);
        }


        function getAlpha(min, max, score) {
            const binWidth = (max - min) / 9;
            const binNumber = Math.floor((score - min) / binWidth);
            return Math.min(1.0, 0.2 + (binNumber * 0.8) / 9);
        }

        return color
    }

    renderFeatureLabel(ctx, feature, featureX, featureX1, featureY, referenceFrame, options) {

        ctx.save();

        let name = feature.name;
        if (name === undefined && feature.gene) name = feature.gene.name;
        if (name === undefined) name = feature.id || feature.ID
        if (!name || name === '.') return;


        let pixelXOffset = options.pixelXOffset || 0;
        const t1 = Math.max(featureX, -pixelXOffset);
        const t2 = Math.min(featureX1, -pixelXOffset + options.viewportWidth);
        const centerX = (t1 + t2) / 2;

        let transform;
        if (this.displayMode === "COLLAPSED" && this.labelDisplayMode === "SLANT") {
            transform = {rotate: {angle: 45}};
        }
        const labelY = getFeatureLabelY(featureY, transform)

        let color = this.getColorForFeature(feature)
        let geneColor;
        let gtexSelection = false;
        if (referenceFrame.selection && GtexUtils.gtexLoaded) {
            // TODO -- for gtex, figure out a better way to do this
            gtexSelection = true;
            geneColor = referenceFrame.selection.colorForGene(name);
        }

        const geneFontStyle = {
            textAlign: "SLANT" === this.labelDisplayMode ? undefined : 'center',
            fillStyle: geneColor || color,
            strokeStyle: geneColor || color
        };

        const textBox = ctx.measureText(name);
        const xleft = centerX - textBox.width / 2;
        const xright = centerX + textBox.width / 2;
        if (options.labelAllFeatures || xleft > options.rowLastX[feature.row] || gtexSelection) {
            options.rowLastX[feature.row] = xright;
            IGVGraphics.fillText(ctx, name, centerX, labelY, geneFontStyle, transform);

        }

        ctx.restore();
    }
    /**
     * The required height in pixels required for the track content.   This is not the visible track height, which
     * can be smaller (with a scrollbar) or larger.
     *
     * @param features
     * @returns {*}
     */
    computePixelHeight(features) {

        if (this.displayMode === "COLLAPSED") {
            return this.margin + this.expandedRowHeight;
        } else {
            let maxRow = 0;
            if (features && (typeof features.forEach === "function")) {
                for (let feature of features) {
                    if (feature.row && feature.row > maxRow) {
                        maxRow = feature.row;
                    }
                }
            }

            const height = this.margin + (maxRow + 1) * ("SQUISHED" === this.displayMode ? this.squishedRowHeight : this.expandedRowHeight);
            return height;

        }
    };

    draw(options) {

        const featureList = options.features;
        const ctx = options.context;
        const bpPerPixel = options.bpPerPixel;
        const bpStart = options.bpStart;
        const pixelWidth = options.pixelWidth;
        const pixelHeight = options.pixelHeight;
        const bpEnd = bpStart + pixelWidth * bpPerPixel + 1;


        if (!this.config.isMergedTrack) {
            IGVGraphics.fillRect(ctx, 0, options.pixelTop, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});
        }

        if (featureList) {

            const rowFeatureCount = [];
            options.rowLastX = [];
            for (let feature of featureList) {
                const row = feature.row || 0;
                if (rowFeatureCount[row] === undefined) {
                    rowFeatureCount[row] = 1;
                } else {
                    rowFeatureCount[row]++;
                }
                options.rowLastX[row] = -Number.MAX_SAFE_INTEGER;
            }

            let lastPxEnd = [];
            for (let feature of featureList) {
                if (feature.end < bpStart) continue;
                if (feature.start > bpEnd) break;

                const row = this.displayMode === 'COLLAPSED' ? 0 : feature.row;
                const featureDensity = pixelWidth / rowFeatureCount[row];
                options.drawLabel = options.labelAllFeatures || featureDensity > 10;
                const pxEnd = Math.ceil((feature.end - bpStart) / bpPerPixel);
                const last = lastPxEnd[row];
                if (!last || pxEnd > last) {
                    this.render(feature, bpStart, bpPerPixel, pixelHeight, ctx, options)

                    // Ensure a visible gap between features
                    const pxStart = Math.floor((feature.start - bpStart) / bpPerPixel)
                    if (last && pxStart - last <= 0) {
                        ctx.globalAlpha = 0.5
                        IGVGraphics.strokeLine(ctx, pxStart, 0, pxStart, pixelHeight, {'strokeStyle': "rgb(255, 255, 255)"})
                        ctx.globalAlpha = 1.0
                    }
                    lastPxEnd[row] = pxEnd;

                }
            }

        } else {
            console.log("No feature list");
        }

    };

    clickedFeatures(clickState, features) {

        const y = clickState.y - this.margin;
        const allFeatures = super.clickedFeatures(clickState, features);

        let row;
        switch (this.displayMode) {
            case 'SQUISHED':
                row = Math.floor(y / this.squishedRowHeight);
                break;
            case 'EXPANDED':
                row = Math.floor(y / this.expandedRowHeight);
                break;
            default:
                row = undefined;
        }

        return allFeatures.filter(function (feature) {
            return (row === undefined || feature.row === undefined || row === feature.row);
        })
    }

    /**
     * Return "popup data" for feature @ genomic location.  Data is an array of key-value pairs
     */
    popupData(clickState, features) {

        features = this.clickedFeatures(clickState, features);
        const genomicLocation = clickState.genomicLocation;

        const data = [];
        for (let feature of features) {

            // Whole genome hack, whole-genome psuedo features store the "real" feature in an _f field
            const f = feature._f || feature;

            const featureData = (typeof f.popupData === "function") ?
                f.popupData(genomicLocation) :
                this.extractPopupData(f);

            if (featureData) {

                if (data.length > 0) {
                    data.push("<hr/><hr/>");
                }

                // If we have an infoURL, find the name property and create the link.  We do this at this level
                // to catch name properties in both custom popupData functions and the generic extractPopupData function

                const infoURL = this.infoURL || this.config.infoURL;
                for (let fd of featureData) {
                    data.push(fd);
                    if (infoURL) {
                        if (fd.name &&
                            fd.name.toLowerCase() === "name" &&
                            fd.value &&
                            StringUtils.isString(fd.value) &&
                            !fd.value.startsWith("<")) {


                            const url = this.infoURL || this.config.infoURL;
                            const href = url.replace("$$", feature.name);
                            data.push({name: "Info", value: `<a target="_blank" href=${href}>${fd.value}</a>`});
                        }
                    }
                }

                //Array.prototype.push.apply(data, featureData);

                // If we have clicked over an exon number it.
                // Disabled for GFF and GTF files if the visibility window is < the feature length since we don't know if we have all exons
                const isGFF = "gff" === this.config.format || "gff3" === this.config.format || "gtf" === this.config.format;
                if (f.exons) {
                    for (let i = 0; i < f.exons.length; i++) {
                        const exon = f.exons[i];
                        if (genomicLocation >= exon.start && genomicLocation <= exon.end) {
                            const exonNumber = isGFF ?
                                exon.number :
                                f.strand === "-" ? f.exons.length - i : i + 1;
                            if (exonNumber) {
                                data.push('<hr/>');
                                data.push({name: "Exon Number", value: exonNumber});
                            }
                            break;
                        }
                    }
                }
            }
        }

        return data;

    }

    menuItemList() {

        const self = this;
        const menuItems = [];

        if (this.render === renderSnp) {
            menuItems.push('<hr/>');
            for (let colorScheme of ["function", "class"]) {
                menuItems.push({
                    object: $(createCheckbox('Color by ' + colorScheme, colorScheme === this.colorBy)),
                    click: () => {
                        this.colorBy = colorScheme;
                        this.trackView.repaintViews();
                    }
                });
            }
        }

        menuItems.push('<hr/>');
        ["COLLAPSED", "SQUISHED", "EXPANDED"].forEach(function (displayMode) {
            const lut =
                {
                    "COLLAPSED": "Collapse",
                    "SQUISHED": "Squish",
                    "EXPANDED": "Expand"
                };

            menuItems.push(
                {
                    object: $(createCheckbox(lut[displayMode], displayMode === self.displayMode)),
                    click: function () {
                        self.displayMode = displayMode;
                        self.config.displayMode = displayMode;
                        self.trackView.checkContentHeight();
                        self.trackView.repaintViews();
                    }
                });
        });

        return menuItems;

    };


    contextMenuItemList(clickState) {

        const features = this.clickedFeatures(clickState);
        if (features.length > 1) {
            features.sort((a, b) => (a.end - a.start) - (b.end - b.start));
        }
        const f = features[0];   // The longest feature
        if ((f.end - f.start) <= 1000000) {
            return [
                {
                    label: 'Copy feature sequence',
                    click: async () => {
                        let seq = await this.browser.genome.getSequence(f.chr, f.start, f.end);
                        if (f.strand === '-') {
                            seq = reverseComplementSequence(seq);
                        }

                        navigator.clipboard.writeText(seq);
                    }
                },
                '<hr/>'
            ];
        } else {
            return undefined;
        }

    }

    description() {

        // if('snp' === this.type) {
        if (renderSnp === this.render) {
            let desc = "<html>" + this.name + '<hr/>';
            desc += '<em>Color By Function:</em><br>';
            desc += '<span style="color:red">Red</span>: Coding-Non-Synonymous, Splice Site<br>';
            desc += '<span style="color:green">Green</span>: Coding-Synonymous<br>';
            desc += '<span style="color:blue">Blue</span>: Untranslated<br>';
            desc += '<span style="color:black">Black</span>: Intron, Locus, Unknown<br><br>';
            desc += '<em>Color By Class:</em><br>';
            desc += '<span style="color:red">Red</span>: Deletion<br>';
            desc += '<span style="color:green">Green</span>: MNP<br>';
            desc += '<span style="color:blue">Blue</span>: Microsatellite, Named<br>';
            desc += '<span style="color:black">Black</span>: Indel, Insertion, SNP';
            desc += "</html>";
            return desc;
        } else {
            return this.name;
        }

    };

    /**
     * Called when the track is removed.  Do any needed cleanup here
     */
    dispose() {
        this.trackView = undefined;
    }
}

/**
 * Monitors track drag events, updates label position to ensure that they're always visible.
 * @param track
 */
function monitorTrackDrag(track) {

    if (track.browser.on) {
        track.browser.on('trackdragend', onDragEnd);
        track.browser.on('trackremoved', unSubscribe);
    }

    function onDragEnd() {
        if (track.trackView && track.displayMode !== "SQUISHED") {
            track.trackView.repaintViews();      // TODO -- refine this to the viewport that was dragged after DOM refactor
        }
    }

    function unSubscribe(removedTrack) {
        if (track.browser.un && track === removedTrack) {
            track.browser.un('trackdragend', onDragEnd);
            track.browser.un('trackremoved', unSubscribe);
        }
    }

}


export default FeatureTrack;
