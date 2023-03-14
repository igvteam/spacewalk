import igv from 'igv'
import {StringUtils} from 'igv-utils'
import {ensembleManager} from './app.js'
import {colorString2Tokens, hex2RGB255, rgb255, rgb255Lerp, rgb255ToThreeJSColor} from './color.js'
import * as THREE from "three";

class DataValueMaterialProvider {

    constructor (colorMinimum, colorMaximum) {
        this.colorMinimum = colorMinimum;
        this.colorMaximum = colorMaximum;
    }

    async configure(track) {

        const { chr, start:startBP, end:endBP, bpPerPixel } = track.browser.referenceFrameList[ 0 ]
        const [ viewport ] = track.trackView.viewports
        const features = await viewport.getFeatures(track, chr, startBP, endBP, bpPerPixel)

        let min = undefined
        let max = undefined

        if (track.dataRange) {
            min = track.dataRange.min
            max = track.dataRange.max
        }

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

        // IN PROGRESS
        const str = `DVMP - Testing revised configuration)`
        console.time(str)

        this.colorList = []
        for (const { startBP, endBP } of ensembleManager.datasource.genomicExtentList) {
            const features = await viewport.getFeatures(track, chr, startBP, endBP, bpPerPixel)
            if (features && features.length > 0) {

                const result = features.reduce((acc, feature, currentIndex) => {

                    if (feature.value > acc.max) {
                        acc.max = feature.value
                        acc.index = currentIndex
                    }

                    return acc

                }, { max: Number.NEGATIVE_INFINITY, index: 0 })

                const feature = features[ result.index ]

                let color
                if (feature.color) {

                    const [ r, g, b ] = colorString2Tokens(feature.color)
                    color = rgb255(r, g, b)
                } else if ('function' === typeof track.getColorForFeature) {

                    color = getRGB255(track.getColorForFeature(feature))
                } else {

                    color = track.color || track.defaultColor
                    if (color) {
                        color = getRGB255(color)
                    }
                }

                const { r, g, b } = color
                this.colorList.push(rgb255ToThreeJSColor(r, g, b))

            }
        }
        console.timeEnd(str)

        console.log(`DVMP - colorlist ${ StringUtils.numberFormatter(this.colorList.length )}`)
    }

    async _IN_PROGRESS_configure(track) {

        const { chr, start, end, bpPerPixel } = track.browser.referenceFrameList[ 0 ]
        const [ viewport ] = track.trackView.viewports

        const allFeatures = await viewport.getFeatures(track, chr, start, end, bpPerPixel)
        const dataRange = igv.IGVUtils.doAutoscale(allFeatures)
        const { min:globalMin, max:globalMax } = dataRange

        this.colorList = []
        const tempColor = new THREE.Color()
        this.rgbFloat32Array = new Float32Array(ensembleManager.datasource.genomicExtentList.length)
        for (let i = 0; i < ensembleManager.datasource.genomicExtentList.length; i++) {

            const { startBP, endBP } = ensembleManager.datasource.genomicExtentList[ i ]
            const features = await viewport.getFeatures(chr, startBP, endBP, bpPerPixel)

            if (features && features.length > 0) {

                const result = features.reduce((acc, feature, currentIndex, array) => {

                    if (feature.value > acc.max) {
                        acc.max = feature.value
                        acc.index = currentIndex
                    }

                    return acc
                }, { max: Number.NEGATIVE_INFINITY, index: 0 })

                const interpolant = (result.max - globalMin)/(globalMax - globalMin)
                const feature = features[ result.index ]

                let color
                if (feature.color) {

                    const [ r, g, b ] = colorString2Tokens(feature.color)
                    color = rgb255(r, g, b)
                } else if ('function' === typeof track.getColorForFeature) {

                    color = getRGB255(track.getColorForFeature(feature))
                } else {

                    color = track.color || track.defaultColor
                    if (color) {
                        color = getRGB255(color)
                    }
                }

                const { r, g, b } = color
                tempColor.set(rgb255ToThreeJSColor(r, g, b)).toArray(this.rgbFloat32Array, i * 3)

            } // if (features)

        } // for (genomicExtentList)

        console.log(`data value material - colorlist ${ StringUtils.numberFormatter(this.colorList.length )}`)
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
