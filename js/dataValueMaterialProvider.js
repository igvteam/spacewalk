import {ensembleManager} from './app.js'
import {colorString2Tokens, hex2RGB255, rgb255, rgb255Lerp, rgb255ToThreeJSColor} from './color.js'

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
        for (const { startBP, endBP } of ensembleManager.datasource.genomicExtentList) {
            const raw = await viewport.getFeatures(track, chr, startBP, endBP, bpPerPixel)
            const featuresForGenomicExtent = raw.filter(({ start, end }) => !(end < startBP) && !(start > endBP))

            if (featuresForGenomicExtent && featuresForGenomicExtent.length > 0) {

                const result = featuresForGenomicExtent.reduce((acc, feature, currentIndex) => {

                    if (feature.value > acc.max) {
                        acc.max = feature.value
                        acc.index = currentIndex
                    }

                    return acc

                }, { max: Number.NEGATIVE_INFINITY, index: 0 })

                maxFeatureList.push(featuresForGenomicExtent[ result.index ])

            } // if (...)

        } //for (genomicExtentList)

        // find global min/max
        const featureValues = maxFeatureList.map(({ value }) => value)
        min = Math.min(...featureValues)
        max = Math.max(...featureValues)

        this.colorList = maxFeatureList.map(feature => {

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
    colorForInterpolant(interpolant) {
        const index = Math.floor(interpolant * (this.colorList.length - 1))
        return this.colorList[ index ]
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
