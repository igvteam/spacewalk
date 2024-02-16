import {ensembleManager, colorRampMaterialProvider, ballAndStick, igvPanel} from "./app.js";

class BallHighlighter {

    constructor (highlightColor) {
        this.highlightColor = highlightColor;
        this.instanceIdList = undefined
    }

    processHit(hit) {
        if (false === this.hasInstanceId(hit.instanceId)) {
            this.configureWithInstanceIdList([hit.instanceId])
        }
    }

    isActive() {
        return !(undefined === this.instanceIdList)
    }

    hasInstanceId(instanceId) {
        if (undefined === this.instanceIdList) {
            return false
        } else {
            return this.instanceIdList.has(instanceId)
        }
    }

    configureWithInstanceIdList(instanceIdList) {
        this.unhighlight()
        this.instanceIdList = new Set()
        for (let instanceId of instanceIdList) {
            this.instanceIdList.add(instanceId)
        }
        this.highlight()
    }

    highlight() {

        if (ballAndStick.balls && this.instanceIdList) {

            const bufferAttribute = ballAndStick.balls.geometry.getAttribute('instanceColor')

            for (const instanceId of this.instanceIdList) {
                this.highlightColor.toArray(bufferAttribute.array, instanceId * 3)
            }

            ballAndStick.balls.geometry.attributes.instanceColor.needsUpdate = true

            const genomicExtentList = ensembleManager.getCurrentGenomicExtentList()
            const interpolantWindowList = Array.from(this.instanceIdList).map(instanceId => genomicExtentList[ instanceId ])
            colorRampMaterialProvider.highlightWithInterpolantWindowList(interpolantWindowList)

        }

    }

    unhighlight() {

        if (ballAndStick.balls && this.instanceIdList) {

            const bufferAttribute = ballAndStick.balls.geometry.getAttribute('instanceColor')

            const genomicExtentList = ensembleManager.getCurrentGenomicExtentList()
            for (const instanceId of this.instanceIdList) {
                const color = igvPanel.materialProvider.colorForInterpolant(genomicExtentList[ instanceId ].interpolant)
                color.toArray(bufferAttribute.array, instanceId * 3)
            }

            ballAndStick.balls.geometry.attributes.instanceColor.needsUpdate = true;

            this.instanceIdList = undefined
         }

    }

}

export default BallHighlighter;
