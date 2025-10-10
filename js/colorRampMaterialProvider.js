
import { colorMapManager } from "./app.js";

class ColorRampMaterialProvider {

    constructor(colorMapName) {
        this.colorMapName = colorMapName
    }

    colorForInterpolant(interpolant) {
        return colorMapManager.retrieveRGBThreeJS(this.colorMapName, interpolant)
    }
}

export default ColorRampMaterialProvider;
