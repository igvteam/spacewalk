import {rgb255Lerp, rgb255ToThreeJSColor} from './color.js'

class DeprecatedDataValueMaterialProvider {

    constructor (colorMinimum, colorMaximum) {
        this.colorMinimum = colorMinimum;
        this.colorMaximum = colorMaximum;
    }

    configure({ startBP, endBP, features, min, max }) {

        this.interpolantWindows = []
        for (let feature of features) {

            // interpolant window
            const start = (feature.start - startBP) / (endBP - startBP)
            const end = (feature.end - startBP) / (endBP - startBP)

            let colorInterpolant
            if (undefined === min && undefined === max) {
                colorInterpolant = 1
            } else {
                colorInterpolant = (feature.value - min) / (max - min)
            }

            this.interpolantWindows.push({ start, end, colorInterpolant })
        }
    }

    colorForInterpolant(interpolant) {

        for (let { start, end, colorInterpolant } of this.interpolantWindows) {
            if (interpolant > start && interpolant < end) {
                const { r, g, b } = rgb255Lerp(this.colorMinimum, this.colorMaximum, colorInterpolant)
                return rgb255ToThreeJSColor(r, g, b)
            }
        }

        const { r, g, b } = this.colorMinimum
        return rgb255ToThreeJSColor(r, g, b)

    }

}

export default DeprecatedDataValueMaterialProvider;
