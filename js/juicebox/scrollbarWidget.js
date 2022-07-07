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

class ScrollbarWidget {

    constructor(browser, $x_axis_scrollbar_container, $y_axis_scrollbar_container) {

        let id;

        this.browser = browser;
        this.isDragging = false;

        // x-axis
        this.$x_axis_scrollbar_container = $x_axis_scrollbar_container;
        this.$x_axis_scrollbar = this.$x_axis_scrollbar_container.find("div[id$='-x-axis-scrollbar']");
        this.$x_label = this.$x_axis_scrollbar.find('div');
        this.$x_label.text('');

        // y-axis
        this.$y_axis_scrollbar_container = $y_axis_scrollbar_container;
        this.$y_axis_scrollbar = this.$y_axis_scrollbar_container.find("div[id$='-y-axis-scrollbar']");
        this.$y_label = this.$y_axis_scrollbar.find('.scrollbar-label-rotation-in-place');
        this.$y_label.text('');

        this.browser.eventBus.subscribe("LocusChange", this);

    }

    receiveEvent({ type, data }) {

        if (!this.isDragging && type === "LocusChange") {


            if (0 === data.state.chr1) {
                this.$x_axis_scrollbar.hide();
                this.$y_axis_scrollbar.hide();
            } else {

                this.$x_axis_scrollbar.show();
                this.$y_axis_scrollbar.show();

                this.$x_axis_scrollbar_container.show();
                this.$y_axis_scrollbar_container.show();

                const {chr1, chr2, zoom, pixelSize, x, y} = data.state
                const dataset = data.dataset || this.browser.dataset

                // bin = bp / bp-per-bin
                // bin = bin
                const chromosomeLengthsBin = [chr1, chr2].map(i => this.browser.genome.getChromosomeAtIndex(i).size / dataset.bpResolutions[zoom])

                // pixel = bin * pixel-per-bin
                const chromosomeLengthsPixel = chromosomeLengthsBin.map(bin => bin * pixelSize);

                //
                const { width, height } = this.browser.contactMatrixView.getViewDimensions()

                // pixel / pixel-per-bin -> bin
                const bins = [ width/pixelSize, height/pixelSize]

                const pixels = [ width, height ]

                const [ xPercentage, yPercentage ] = bins.map((bin, i) => {
                    const binPercentage = Math.min(bin, chromosomeLengthsBin[i]) / chromosomeLengthsBin[i];
                    const pixelPercentage = Math.min(chromosomeLengthsPixel[i], pixels[i]) / pixels[i];
                    return Math.max(1, Math.round(100 * binPercentage * pixelPercentage));
                });

                this.$x_axis_scrollbar.css('width', `${ xPercentage }%`);
                this.$y_axis_scrollbar.css('height', `${ yPercentage }%`);

                this.$x_axis_scrollbar.css('left', `${ Math.round(100 * x / chromosomeLengthsBin[0]) }%`);
                this.$y_axis_scrollbar.css('top', `${ Math.round(100 * y / chromosomeLengthsBin[1]) }%`);

                this.$x_label.text(this.browser.genome.getChromosomeAtIndex(chr1).name);
                this.$y_label.text(this.browser.genome.getChromosomeAtIndex(chr2).name);

            }

        }
    }
}

export default ScrollbarWidget
