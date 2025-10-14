import { rgb255, rgb255Lerp, rgb255ToThreeJSColor, blendColorsLab, hexOrRGB255StringtoRGB255 } from './utils/colorUtils.js'

class TrackMaterialProvider {

    constructor (colorMinimum, colorMaximum, ensembleManager) {
        this.colorMinimum = colorMinimum;
        this.colorMaximum = colorMaximum;
        this.ensembleManager = ensembleManager;
        this.trackColorLists = new Map();
        this.trackDataRanges = new Map();
    }

    async configure(track) {
        const [viewport] = track.trackView.viewports;
        const { chr, bpPerPixel } = track.browser.referenceFrameList[0];
        const genomicExtentList = this.ensembleManager.getCurrentGenomicExtentList();

        // Collect features for all genomic extents
        const allFeaturesPerExtent = await this.collectFeaturesForExtents(viewport, track, chr, bpPerPixel, genomicExtentList);

        // Create color list based on feature type (value-based or color-only)
        const colorList = this.createColorList(allFeaturesPerExtent, track);

        // Store color list in the map using a unique track identifier
        // Use track name + index to ensure uniqueness for tracks with same name
        const trackId = this.getUniqueTrackId(track);
        this.trackColorLists.set(trackId, colorList);

        // Update the aggregated color list by blending all track color lists
        this.updateAggregatedColorList();
    }

    removeTrack(trackName) {
        // Find and remove all tracks with this name
        const keysToDelete = [];
        for (const [trackId, colorList] of this.trackColorLists.entries()) {
            if (trackId.startsWith(trackName + '|')) {
                keysToDelete.push(trackId);
            }
        }

        keysToDelete.forEach(key => {
            this.trackColorLists.delete(key);
            this.trackDataRanges.delete(key);
        });

        // Update the aggregated color list after removing tracks
        this.updateAggregatedColorList();
    }

    removeTrackInstance(track) {
        // Remove a specific track instance using its unique ID
        const trackId = this.getUniqueTrackId(track);
        this.trackColorLists.delete(trackId);
        this.trackDataRanges.delete(trackId);

        // Update the aggregated color list after removing the track
        this.updateAggregatedColorList();
    }

    getUniqueTrackId(track) {
        // Create a unique identifier: trackName + index in browser
        const trackIndex = track.browser.trackViews.findIndex(tv => tv.track === track);
        return `${track.name}|${trackIndex}`;
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
        const firstColorList = this.trackColorLists.values().next().value;
        const colorListLength = firstColorList.length;

        if (colorListLength === 0) {
            console.warn('TrackMaterialProvider: Color lists are empty');
            this.finalColorList = [];
            return;
        }

        this.finalColorList = [];

        // Calculate weights for each track based on their data range
        const trackWeights = this.calculateTrackWeights();

        // For each position in the color lists, blend colors from all tracks
        for (let i = 0; i < colorListLength; i++) {
            const rgb255List = [];
            const weights = [];

            // Collect color and weight from each track at this position
            for (const [trackId, colorList] of this.trackColorLists.entries()) {

                const { r, g, b } = colorList[i];
                rgb255List.push([ Math.round(r * 255),Math.round(g * 255),Math.round(b * 255) ]);

                const weight = trackWeights.get(trackId) || 1.0;
                weights.push(weight);
            }

            // Blend colors in LAB space with weights and convert back to Three.js color
            const [r, g, b] = blendColorsLab(rgb255List, weights);
            this.finalColorList.push(rgb255ToThreeJSColor(r, g, b));
        }

        console.log(`TrackMaterialProvider: Blended ${this.trackColorLists.size} tracks into ${this.finalColorList.length} colors`);
    }

    hasTrack(trackName) {
        // Check if any track with this name exists
        for (const trackId of this.trackColorLists.keys()) {
            if (trackId.startsWith(trackName + '|')) {
                return true;
            }
        }
        return false;
    }

    getTrackNames() {
        // Extract unique track names from the keys (remove the index part)
        const trackNames = new Set();
        for (const trackId of this.trackColorLists.keys()) {
            const trackName = trackId.split('|')[0];
            trackNames.add(trackName);
        }
        return Array.from(trackNames);
    }

    clearAllTracks() {
        // Clear all tracks and reset to empty state
        this.trackColorLists.clear();
        this.trackDataRanges.clear();
        this.finalColorList = [];
        console.log('TrackMaterialProvider: Cleared all tracks');
    }

    calculateTrackWeights() {
        const weights = new Map();

        if (this.trackDataRanges.size === 0) {
            // No data ranges available, use equal weights
            for (const trackId of this.trackColorLists.keys()) {
                weights.set(trackId, 1.0);
            }
            return weights;
        }

        // Calculate the total range across all tracks
        const allRanges = Array.from(this.trackDataRanges.values());
        const globalMin = Math.min(...allRanges.map(r => r.min));
        const globalMax = Math.max(...allRanges.map(r => r.max));
        const globalRange = globalMax - globalMin;

        if (globalRange === 0) {
            // All tracks have the same range, use equal weights
            for (const trackId of this.trackColorLists.keys()) {
                weights.set(trackId, 1.0);
            }
            return weights;
        }

        // Calculate weights based on relative data range
        // Tracks with larger ranges get higher weights
        for (const [trackId, range] of this.trackDataRanges.entries()) {
            const trackRange = range.max - range.min;
            const relativeRange = trackRange / globalRange;
            weights.set(trackId, relativeRange);
        }

        console.log('TrackMaterialProvider: Calculated weights:', Object.fromEntries(weights));
        return weights;
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

        // Calculate min/max for THIS specific genomic extent (not entire track)
        const allFeatureValues = maxFeatures.map(f => f.value);
        const min = Math.min(...allFeatureValues);
        const max = Math.max(...allFeatureValues);

        // Store the data range for this track's genomic extent
        this.trackDataRanges = this.trackDataRanges || new Map();
        const trackId = this.getUniqueTrackId(track);
        this.trackDataRanges.set(trackId, { min, max });

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

