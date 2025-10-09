import {ensembleManager} from './app.js'
import { rgb255, rgb255Lerp, rgb255ToThreeJSColor, blendColorsLab, hexOrRGB255StringtoRGB255 } from './utils/colorUtils.js'

class TrackMaterialProvider {

    constructor (colorMinimum, colorMaximum) {
        this.colorMinimum = colorMinimum;
        this.colorMaximum = colorMaximum;
        // Map to store color lists per track: key = track.name, value = colorList
        this.trackColorLists = new Map();
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
        const colorList = this.createColorList(allFeaturesPerExtent, track);
        
        // Store color list in the map using track name as key
        this.trackColorLists.set(track.name, colorList);
        
        // Update the aggregated color list by blending all track color lists
        this.updateAggregatedColorList();
    }

    removeTrack(trackName) {
        this.trackColorLists.delete(trackName);
        
        // Update the aggregated color list after removing a track
        this.updateAggregatedColorList();
    }

    updateAggregatedColorList() {
        if (this.trackColorLists.size === 0) {
            this.finalColorList = [];
            return;
        }

        if (this.trackColorLists.size === 1) {
            // Only one track - use it directly (no blending needed)
            this.finalColorList = this.trackColorLists.values().next().value;
            return;
        }

        // Multiple tracks - blend them together using LAB color space
        const allColorLists = Array.from(this.trackColorLists.values());
        
        // Determine the minimum length among all color lists
        const minLength = Math.min(...allColorLists.map(list => list.length));
        
        if (minLength === 0) {
            console.warn('TrackMaterialProvider: One or more tracks have empty color lists');
            this.finalColorList = [];
            return;
        }

        // Check if all lists have the same length
        const allSameLength = allColorLists.every(list => list.length === minLength);
        if (!allSameLength) {
            console.warn(`TrackMaterialProvider: Color lists have different lengths. Using shortest length: ${minLength}`);
        }

        this.finalColorList = [];

        // For each position in the color lists, blend colors from all tracks
        for (let i = 0; i < minLength; i++) {
            const rgb255List = [];

            // Collect color from each track at this position
            for (const colorList of allColorLists) {
                const threeColor = colorList[i];
                // Convert Three.js color (0-1 range) to RGB255 (0-255 range)
                rgb255List.push([
                    Math.round(threeColor.r * 255),
                    Math.round(threeColor.g * 255),
                    Math.round(threeColor.b * 255)
                ]);
            }

            // Blend colors in LAB space and convert back to Three.js color
            const [r, g, b] = blendColorsLab(rgb255List);
            this.finalColorList.push(rgb255ToThreeJSColor(r, g, b));
        }

        console.log(`TrackMaterialProvider: Blended ${this.trackColorLists.size} tracks into ${this.finalColorList.length} colors`);
    }

    hasTrack(trackName) {
        return this.trackColorLists.has(trackName);
    }

    getTrackNames() {
        return Array.from(this.trackColorLists.keys());
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

export default TrackMaterialProvider;

