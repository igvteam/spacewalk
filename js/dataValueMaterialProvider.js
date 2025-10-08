import {ensembleManager} from './app.js'
import { rgb255, rgb255Lerp, rgb255ToThreeJSColor, blendColorsLab, hexOrRGB255StringtoRGB255 } from './utils/colorUtils.js'

class DataValueMaterialProvider {

    constructor (colorMinimum, colorMaximum) {
        this.colorMinimum = colorMinimum;
        this.colorMaximum = colorMaximum;
    }

    async configure(track) {
        const [viewport] = track.trackView.viewports;
        const { chr, bpPerPixel } = track.browser.referenceFrameList[0];
        const genomicExtentList = ensembleManager.getCurrentGenomicExtentList();

        // Collect features for all genomic extents
        const allFeaturesPerExtent = await this.collectFeaturesForExtents(
            viewport, track, chr, bpPerPixel, genomicExtentList
        );

        // Create color list based on feature type (value-based or color-only)
        this.finalColorList = this.createColorList(allFeaturesPerExtent, track);
    }

    async collectFeaturesForExtents(viewport, track, chr, bpPerPixel, genomicExtentList) {
        const result = [];

        for (const { startBP, endBP } of genomicExtentList) {
            const raw = await viewport.getFeatures(track, chr, startBP, endBP, bpPerPixel);
            const features = raw.filter(({ start, end }) => {
                return (start < startBP && startBP < end) ||
                       (start < endBP && endBP < end) ||
                       (start > startBP && end < endBP);
            });

            if (features && features.length > 0) {
                result.push(features);
            }
        }

        return result;
    }

    createColorList(allFeaturesPerExtent, track) {
        if (allFeaturesPerExtent.length === 0) return [];

        // Check if features have values (if ANY lacks value, assume ALL lack it)
        const firstFeatureSet = allFeaturesPerExtent[0];
        const hasValues = firstFeatureSet.every(feature => feature.value !== undefined);

        if (!hasValues) {
            // Color-only features: blend colors from each extent
            return allFeaturesPerExtent.map(features => 
                this.blendFeatureColors(features, track)
            );
        }

        // Value-based features: use data values to create color ramp
        return this.createValueBasedColors(allFeaturesPerExtent, track);
    }

    blendFeatureColors(features, track) {
        const rgb255List = features.map(feature => {
            const rgb255String = feature.color || track.constructor.getDefaultColor();
            const [a, green, b] = rgb255String.split(',');
            const [lp, red] = a.split('(');
            const [blue, rp] = b.split(')');
            return [parseInt(red, 10), parseInt(green, 10), parseInt(blue, 10)];
        });
        
        const [r255, g255, b255] = blendColorsLab(rgb255List);
        return rgb255ToThreeJSColor(r255, g255, b255);
    }

    createValueBasedColors(allFeaturesPerExtent, track) {
        // Get max feature from each extent
        const maxFeatures = allFeaturesPerExtent.map(features => 
            features.reduce((acc, feature) => 
                feature.value > acc.value ? feature : acc
            )
        );

        // Calculate min/max across all features
        const min = track.dataRange?.min ?? Math.min(...maxFeatures.map(f => f.value));
        const max = track.dataRange?.max ?? Math.max(...maxFeatures.map(f => f.value));

        // Create interpolated colors
        return maxFeatures.map(feature => {
            const color = this.getFeatureColor(feature, track);
            const interpolant = (feature.value - min) / (max - min);

            if (color) {
                const { r, g, b } = rgb255Lerp(this.colorMinimum, color, interpolant);
                return rgb255ToThreeJSColor(r, g, b);
            } else {
                const { r, g, b } = rgb255Lerp(this.colorMinimum, this.colorMaximum, interpolant);
                return rgb255ToThreeJSColor(r, g, b);
            }
        });
    }

    getFeatureColor(feature, track) {
        if (feature.color) {
            const [r, g, b] = hexOrRGB255StringtoRGB255(feature.color);
            return rgb255(r, g, b);
        }
        
        if (typeof track.getColorForFeature === 'function') {
            return hexOrRGB255StringtoRGB255(track.getColorForFeature(feature));
        }
        
        const trackColor = track.color || track.defaultColor;
        return trackColor ? hexOrRGB255StringtoRGB255(trackColor) : null;
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
