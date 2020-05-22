import * as THREE from "../node_modules/three/build/three.module.js";
import { instanceColorString } from "./sceneManager.js";
import { eventBus, ballAndStick } from "./app.js";

const rgbTemp = new THREE.Color();

class PointCloudPickHighlighter {

    constructor (highlightColor) {
        this.highlightColor = highlightColor;
        this.list = [];
    }

    processHit(hit) {
        if (undefined !== hit.instanceId) {
            if (false === this.hasInstanceId(hit.instanceId)) {
                this.configureWithInstanceIdList([ hit.instanceId ]);
                eventBus.post({ type: "PickerDidHitObject", data: hit.instanceId });
            }
        }
    }

    hasInstanceId(instanceId) {
        return this.list.has(instanceId);
    }

    configureWithInstanceIdList(list) {
        this.unhighlight();
        for (let instanceId of list) {
            this.list.add(instanceId);
        }
        this.highlight();
    }

    highlight() {

        if (undefined !== ballAndStick.balls) {

            for (let instanceId of this.list) {
                rgbTemp.set(this.highlightColor).toArray(ballAndStick.rgbFloat32Array, instanceId * 3);
            }

            ballAndStick.balls.geometry.attributes[ instanceColorString ].needsUpdate = true;
        }

    }

    unhighlight() {

        if (undefined !== ballAndStick.balls) {

            for (let instanceId of this.list) {
                ballAndStick.rgb[ instanceId ].toArray(ballAndStick.rgbFloat32Array, instanceId * 3);
            }

            ballAndStick.balls.geometry.attributes[ instanceColorString ].needsUpdate = true;

            this.list.clear();

        }

    }

}

export default PointCloudPickHighlighter;
