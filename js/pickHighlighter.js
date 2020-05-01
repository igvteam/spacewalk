import * as THREE from "../node_modules/three/build/three.module.js";
import { ballAndStick } from "./app.js";
import { instanceColorString } from "./sceneManager.js";

const rgbTemp = new THREE.Color();

class PickHighlighter {

    constructor (highlightColor) {

        this.highlightColor = highlightColor;

        this.objects = new Set();
        this.objects.clear();
        this.instanceId = undefined;
    }

    hasInstanceId(instanceId) {
        return this.instanceId === instanceId;
    }

    configureWithInstanceId(instanceId) {
        this.unhighlightInstance();
        this.instanceId = instanceId
        this.highlightInstance();
    }

    highlightInstance() {
        rgbTemp.set(this.highlightColor).toArray(ballAndStick.rgbFloat32Array, this.instanceId * 3);
        ballAndStick.balls.geometry.attributes[ instanceColorString ].needsUpdate = true;
    }

    unhighlightInstance() {

        if (undefined !== this.instanceId) {
            ballAndStick.rgb[ this.instanceId ].toArray(ballAndStick.rgbFloat32Array, this.instanceId * 3);
            ballAndStick.balls.geometry.attributes[ instanceColorString ].needsUpdate = true;
            this.instanceId = undefined;
        }

    }

}

export default PickHighlighter;
