import { defaultColormapName } from "./utils/colorMapManager.js";
import { colorMapManager } from "./app.js";

class ColorRampMaterialProvider {

    constructor() {
    }

    colorForInterpolant(interpolant) {
        return colorMapManager.retrieveRGBThreeJS(defaultColormapName, interpolant)
    }
}

export default ColorRampMaterialProvider;
