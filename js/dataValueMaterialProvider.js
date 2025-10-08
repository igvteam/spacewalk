import {ensembleManager} from './app.js'
import { rgb255, rgb255Lerp, rgb255ToThreeJSColor, blendColorsLab, hexOrRGB255StringtoRGB255 } from './utils/colorUtils.js'

class DataValueMaterialProvider {

    constructor (colorMinimum, colorMaximum) {
        this.colorMinimum = colorMinimum;
        this.colorMaximum = colorMaximum;
    }

    async configure(track) {

        let min = undefined
        let max = undefined

        if (track.dataRange) {
            min = track.dataRange.min
            max = track.dataRange.max
        }

        const [ viewport ] = track.trackView.viewports
        const { chr, bpPerPixel } = track.browser.referenceFrameList[ 0 ]

        const maxFeatureList = []
        let colorList = []
        const genomicExtentList = ensembleManager.getCurrentGenomicExtentList()

        for (const { startBP, endBP } of genomicExtentList) {
            const raw = await viewport.getFeatures(track, chr, startBP, endBP, bpPerPixel)
            const featuresForGenomicExtent = raw.filter(({ start, end }) => {

                const a = start < startBP && startBP < end
                const b = start < endBP && endBP < end
                const c = start > startBP && end < endBP

                return a || b || c
            })

            if (featuresForGenomicExtent && featuresForGenomicExtent.length > 0) {

                const list = featuresForGenomicExtent.filter(feature => undefined === feature.value)

                if (list.length > 0) {

                    const rgb255List = featuresForGenomicExtent.map((feature) => {
                        const rgb255String = feature.color || track.constructor.getDefaultColor()
                        let [ a, green, b ] = rgb255String.split(',')
                        let [ lp, red ] = a.split('(')
                        let [ blue, rp ] = b.split(')')
                        return [ parseInt(red, 10), parseInt(green, 10), parseInt(blue, 10) ]
                    })
                    const [ r255, g255, b255 ] = blendColorsLab(rgb255List)

                    colorList.push(rgb255ToThreeJSColor(r255, g255, b255))
                } else {
                    const result = featuresForGenomicExtent.reduce((acc, feature, currentIndex) => {

                        if (feature.value > acc.max) {
                            acc.max = feature.value
                            acc.index = currentIndex
                        }

                        return acc

                    }, { max: Number.NEGATIVE_INFINITY, index: 0 })
                    maxFeatureList.push(featuresForGenomicExtent[ result.index ])

                    const featureValues = maxFeatureList.map(({ value }) => value)
                    min = Math.min(...featureValues)
                    max = Math.max(...featureValues)

                    colorList = maxFeatureList.map(feature => {

                        let color
                        if (feature.color) {

                            const [ r, g, b ] = hexOrRGB255StringtoRGB255(feature.color)
                            color = rgb255(r, g, b)
                        } else if ('function' === typeof track.getColorForFeature) {
                            color = hexOrRGB255StringtoRGB255(track.getColorForFeature(feature))
                        } else {

                            color = track.color || track.defaultColor
                            if (color) {
                                color = hexOrRGB255StringtoRGB255(color)
                            }
                        }

                        const interpolant = (feature.value - min) / (max - min)

                        if (color) {
                            const { r, g, b } = rgb255Lerp(this.colorMinimum, color, interpolant)
                            return rgb255ToThreeJSColor(r, g, b)
                        } else {
                            const { r, g, b } = rgb255Lerp(this.colorMinimum, this.colorMaximum, interpolant)
                            return rgb255ToThreeJSColor(r, g, b)
                        }

                    })
                }

            } // if (...)

        } // for (genomic extent list)

        this.finalColorList = [...colorList]

    }

    colorForInterpolant(interpolant) {

        const a =  Math.floor(interpolant * (this.finalColorList.length - 1))
        const colorA = this.finalColorList[ a ]

        const b =  Math.ceil(interpolant * (this.finalColorList.length - 1))
        const colorB = this.finalColorList[ b ]

        return colorA.clone().lerp(colorB, interpolant)

    }

}

export default DataValueMaterialProvider;
