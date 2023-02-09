import {colorString2Tokens, hex2RGB255, rgb255, rgb255Lerp, rgb255ToThreeJSColor} from './color.js'

class DataValueMaterialProvider {

    constructor (colorMinimum, colorMaximum) {
        this.colorMinimum = colorMinimum;
        this.colorMaximum = colorMaximum;
    }

    configure({ track, startBP, endBP, features, min, max }) {

        this.interpolantWindows = []
        for (let feature of features) {

            // interpolant window
            const start = (feature.start - startBP) / (endBP - startBP)
            const end = (feature.end - startBP) / (endBP - startBP)

            if (feature.color) {
                const [ r, g, b ] = colorString2Tokens(feature.color)
                this.interpolantWindows.push({ start, end, color: rgb255ToThreeJSColor(r, g, b) })
            } else if ('function' === typeof track.getColorForFeature) {
                const color = track.getColorForFeature(feature)

                if (color.startsWith('#')) {
                    const { r, g, b } = hex2RGB255(color)
                    this.interpolantWindows.push({ start, end, color: rgb255ToThreeJSColor(r, g, b) })
                } else {
                    const [ r, g, b ] = colorString2Tokens(color)
                    this.interpolantWindows.push({ start, end, color: rgb255ToThreeJSColor(r, g, b) })
                }


            } else if(track.color)  {

                if (track.color.startsWith('#')) {
                    const { r, g, b } = hex2RGB255(track.color)
                    this.interpolantWindows.push({ start, end, color: rgb255ToThreeJSColor(r, g, b) })
                } else {
                    const [ r, g, b ] = colorString2Tokens(track.color)
                    this.interpolantWindows.push({ start, end, color: rgb255ToThreeJSColor(r, g, b) })
                }

            } else {

                let colorInterpolant
                if (undefined === min && undefined === max) {
                    colorInterpolant = 1
                } else {
                    colorInterpolant = (feature.value - min) / (max - min)
                }

                this.interpolantWindows.push({ start, end, colorInterpolant })
            }

        }
    }

    colorForInterpolant(interpolant) {

        for (const interpolantWindow of this.interpolantWindows) {

            const { start, end } = interpolantWindow

            if (interpolant > start && interpolant < end) {

                if (interpolantWindow.color) {
                    return interpolantWindow.color
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

export default DataValueMaterialProvider;
