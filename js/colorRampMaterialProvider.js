
import * as THREE from 'three'

class ColorRampMaterialProvider {

    constructor(colorMapName, colorMapManager) {
        this.colorMapName = colorMapName
        this.colorMapManager = colorMapManager
        
        console.log('ColorRampMaterialProvider constructor:', {
            colorMapName,
            hasColorMapManager: !!colorMapManager,
            hasDictionary: !!(colorMapManager && colorMapManager.dictionary),
            dictionaryKeys: colorMapManager && colorMapManager.dictionary ? Object.keys(colorMapManager.dictionary) : []
        });
    }

    colorForInterpolant(interpolant) {
        try {
            if (!this.colorMapManager) {
                console.error('ColorRampMaterialProvider.colorForInterpolant: colorMapManager is null');
                return new THREE.Color(1, 0, 0); // Return red as fallback
            }
            if (!this.colorMapManager.dictionary || !this.colorMapManager.dictionary[this.colorMapName]) {
                console.error('ColorRampMaterialProvider.colorForInterpolant: colorMap not found:', this.colorMapName, 'Available:', Object.keys(this.colorMapManager.dictionary || {}));
                return new THREE.Color(1, 0, 0); // Return red as fallback
            }
            const result = this.colorMapManager.retrieveRGBThreeJS(this.colorMapName, interpolant);
            return result;
        } catch (error) {
            console.error('ColorRampMaterialProvider.colorForInterpolant error:', error);
            return new THREE.Color(1, 0, 0); // Return red as fallback
        }
    }
}

export default ColorRampMaterialProvider;
