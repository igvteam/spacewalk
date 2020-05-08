import * as THREE from "../node_modules/three/build/three.module.js";
import { ballAndStick } from "./app.js";
import { instanceColorString } from "./sceneManager.js";

const rgbTemp = new THREE.Color();

class PickHighlighter {

    constructor (highlightColor) {
        this.highlightColor = highlightColor;
        this.instanceIdList = new Set();
        this.instanceIdList.clear();
    }

    hasInstanceId(instanceId) {
        return this.instanceIdList.has(instanceId);
    }

    configureWithInstanceIdList(instanceIdList) {
        this.unhighlightInstance();
        for (let instanceId of instanceIdList) {
            this.instanceIdList.add(instanceId);
        }
        this.highlightInstance();
    }

    highlightInstance() {

        if (undefined !== ballAndStick.balls) {

            for (let instanceId of this.instanceIdList) {
                rgbTemp.set(this.highlightColor).toArray(ballAndStick.rgbFloat32Array, instanceId * 3);
            }

            ballAndStick.balls.geometry.attributes[ instanceColorString ].needsUpdate = true;
        }

    }

    unhighlightInstance() {

        if (undefined !== ballAndStick.balls) {

            for (let instanceId of this.instanceIdList) {
                ballAndStick.rgb[ instanceId ].toArray(ballAndStick.rgbFloat32Array, instanceId * 3);
            }

            ballAndStick.balls.geometry.attributes[ instanceColorString ].needsUpdate = true;

            this.instanceIdList.clear();

        }

    }

}

export default PickHighlighter;
