import igv from 'igv'
import {StringUtils} from 'igv-utils';
import {ensembleManager} from './app.js'
import {colorString2Tokens, hex2RGB255, rgb255, rgb255Lerp, rgb255ToThreeJSColor} from './color.js'

class DataValueMaterialProvider {

    constructor (colorMinimum, colorMaximum) {
        this.colorMinimum = colorMinimum;
        this.colorMaximum = colorMaximum;
    }

    async configure(track) {

        const { chr, start:startBP, end:endBP, bpPerPixel } = track.browser.referenceFrameList[ 0 ]
        const features = await track.getFeatures(chr, startBP, endBP, bpPerPixel)
        const { min, max } = igv.IGVUtils.doAutoscale(features)

        this.interpolantWindows = []
        for (let feature of features) {

            let colorInterpolant
            if (undefined === min && undefined === max) {
                colorInterpolant = 1
            } else {
                colorInterpolant = (feature.value - min) / (max - min)
            }

            const start = (feature.start - startBP) / (endBP - startBP)
            const end = (feature.end - startBP) / (endBP - startBP)

            if (feature.color) {

                const [ r, g, b ] = colorString2Tokens(feature.color)
                this.interpolantWindows.push({ colorInterpolant, start, end, color: rgb255(r, g, b) })
            } else if ('function' === typeof track.getColorForFeature) {

                this.interpolantWindows.push({ colorInterpolant, start, end, color: getRGB255(track.getColorForFeature(feature))})
            } else {

                const color = track.color || track.defaultColor
                if (color) {
                    this.interpolantWindows.push({ colorInterpolant, start, end, color: getRGB255(color)})
                }

            }

        }
    }

    async _IN_PROGRESS_configure(track) {

        const { chr, start, end, bpPerPixel } = track.browser.referenceFrameList[ 0 ]

        const [ viewport ] = track.trackView.viewports
        const { features } = viewport.featureCache

        const allFeatures = await track.getFeatures(chr, start, end, bpPerPixel)
        const dataRange = igv.IGVUtils.doAutoscale(allFeatures)
        const { min:globalMin, max:globalMax } = dataRange

        this.colorList = []
        for (const { startBP, endBP } of ensembleManager.datasource.genomicExtentList) {

            const features = await track.getFeatures(chr, startBP, endBP, bpPerPixel)

            if (features && features.length > 0) {

                const result = features.reduce((acc, feature, currentIndex, array) => {

                    if (feature.value > acc.max) {
                        acc.max = feature.value
                        acc.index = currentIndex
                    }

                    return acc
                }, { max: Number.NEGATIVE_INFINITY, index: 0 })

                const interpolant = (result.max - globalMin)/(globalMax - globalMin)
                const feature = features[ result.index ]

                let color
                if (feature.color) {

                    const [ r, g, b ] = colorString2Tokens(feature.color)
                    color = rgb255(r, g, b)
                } else if ('function' === typeof track.getColorForFeature) {

                    color = getRGB255(track.getColorForFeature(feature))
                } else {

                    color = track.color || track.defaultColor
                    if (color) {
                        color = getRGB255(color)
                    }
                }

                this.colorList.push({ color, interpolant })

            } // if (features)

        } // for (genomicExtentList)

        console.log(`data value material - colorlist ${ StringUtils.numberFormatter(this.colorList.length )}`)
    }

    colorForInterpolant(interpolant) {

        for (const interpolantWindow of this.interpolantWindows) {

            const { start, end } = interpolantWindow

            if (interpolant > start && interpolant < end) {

                if (interpolantWindow.color) {
                    // return interpolantWindow.color

                    const { r, g, b } = rgb255Lerp(this.colorMinimum, interpolantWindow.color, interpolantWindow.colorInterpolant)
                    return rgb255ToThreeJSColor(r, g, b)

                } else {
                    const { r, g, b } = rgb255Lerp(this.colorMinimum, this.colorMaximum, interpolantWindow.colorInterpolant)
                    return rgb255ToThreeJSColor(r, g, b)
                }

            }

        }

        const { r, g, b } = this.colorMinimum
        return rgb255ToThreeJSColor(r, g, b)

    }

}

function getRGB255(color) {

    if (color.startsWith('#')) {
        const { r, g, b } = hex2RGB255(color)
        return rgb255(r, g, b)
    } else {
        const [ r, g, b ] = colorString2Tokens(color)
        return rgb255(r, g, b)
    }

}

export default DataValueMaterialProvider;
