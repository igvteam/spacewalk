import * as THREE from "three";
import { ensembleManager, colorRampMaterialProvider, ballAndStick } from "./app.js";

const rgbTemp = new THREE.Color();

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

            for (let instanceId of this.instanceIdList) {
                rgbTemp.set(this.highlightColor).toArray(ballAndStick.rgbFloat32Array, instanceId * 3)
            }

            ballAndStick.balls.geometry.attributes.instanceColor.needsUpdate = true;

            const interpolantWindowList = Array.from(this.instanceIdList).map(instanceId => ensembleManager.currentTrace[ instanceId ].colorRampInterpolantWindow)
            colorRampMaterialProvider.highlightWithInterpolantWindowList(interpolantWindowList)

        }

    }

    unhighlight() {

        if (ballAndStick.balls && this.instanceIdList) {

            for (let instanceId of this.instanceIdList) {
                ballAndStick.rgb[ instanceId ].toArray(ballAndStick.rgbFloat32Array, instanceId * 3);
            }

            this.instanceIdList = undefined

            ballAndStick.balls.geometry.attributes.instanceColor.needsUpdate = true;

         }

    }

}

export default BallHighlighter;
