import * as THREE from "three";
import { ensembleManager, colorRampMaterialProvider, ballAndStick } from "./app.js";

const rgbTemp = new THREE.Color();

class BallHighlighter {

    constructor (highlightColor) {
        this.highlightColor = highlightColor;
        this.instanceIdList = new Set();
        this.instanceIdList.clear();
    }

    processHit(hit) {
        if (false === this.hasInstanceId(hit.instanceId)) {
            this.configureWithInstanceIdList([ hit.instanceId ]);
            colorRampMaterialProvider.highlightWithInterpolantWindowList([ ensembleManager.currentTrace[ hit.instanceId ].colorRampInterpolantWindow ])
        }
    }

    hasInstanceId(instanceId) {
        return this.instanceIdList.has(instanceId);
    }

    configureWithInstanceIdList(instanceIdList) {
        this.unhighlight();
        for (let instanceId of instanceIdList) {
            this.instanceIdList.add(instanceId);
        }
        this.highlight();
    }

    highlight() {

        if (ballAndStick.balls && this.instanceIdList) {

            for (let instanceId of this.instanceIdList) {
                rgbTemp.set(this.highlightColor).toArray(ballAndStick.rgbFloat32Array, instanceId * 3);
            }

            ballAndStick.balls.geometry.attributes.instanceColor.needsUpdate = true;
        }

    }

    unhighlight() {

        if (ballAndStick.balls && this.instanceIdList) {

            for (let instanceId of this.instanceIdList) {
                ballAndStick.rgb[ instanceId ].toArray(ballAndStick.rgbFloat32Array, instanceId * 3);
            }

            ballAndStick.balls.geometry.attributes.instanceColor.needsUpdate = true;

            this.instanceIdList.clear();

        }

    }

}

export default BallHighlighter;
