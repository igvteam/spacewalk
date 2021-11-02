import {rgb255Lerp, rgb255ToThreeJSColor} from './color.js'

class DataValueMaterialProvider {

    constructor (colorMinimum, colorMaximum) {
        this.colorMinimum = colorMinimum;
        this.colorMaximum = colorMaximum;
    }

    configure({ startBP, endBP, features, min, max }) {
        this.startBP = startBP;
        this.endBP = endBP;
        this.features = features;
        this.min = min;
        this.max = max;
    }

    colorForInterpolant(interpolant) {

        const index = Math.floor(interpolant * (this.features.length - 1))
        const { value } = this.features[ index ]

        const colorInterpolant = (value - this.min) / (this.max - this.min)
        const { r, g, b } = rgb255Lerp(this.colorMinimum, this.colorMaximum, colorInterpolant)

        return rgb255ToThreeJSColor(r, g, b)
    }

}

export default DataValueMaterialProvider;
