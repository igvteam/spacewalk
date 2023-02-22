import {StringUtils} from "igv-utils";
import {colorString2Tokens, hex2RGB255, rgb255, rgb255Lerp, rgb255ToThreeJSColor} from './color.js'

class DataValueMaterialProvider {

    constructor (colorMinimum, colorMaximum) {
        this.colorMinimum = colorMinimum;
        this.colorMaximum = colorMaximum;
    }

    configure({ track, startBP, endBP, features, min, max }) {

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

        console.log(`data value material provider - features(${ StringUtils.numberFormatter(features.length) }) interpolant-window ${ StringUtils.numberFormatter(this.interpolantWindows.length) }`)
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
