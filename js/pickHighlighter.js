import * as THREE from "../node_modules/three/build/three.module.js";
import { ballAndStick } from "./app.js";
import { instanceColorString } from "./sceneManager.js";

const tempColor = new THREE.Color();

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

    configureInstanceIdList(instanceId) {
        this.unhighlightInstance();
        this.instanceId = instanceId
        this.highlightInstance();
    }

    highlightInstance() {
        tempColor.set(this.highlightColor).toArray(ballAndStick.rgbFloat32Array, this.instanceId * 3);
        ballAndStick.balls.geometry.attributes[ instanceColorString ].needsUpdate = true;
    }

    unhighlightInstance() {

        // tempColor.set(this.highlightColor).toArray(ballAndStick.rgbFloat32Array, this.instanceId * 3);
        // ballAndStick.balls.geometry.attributes[ instanceColorString ].needsUpdate = true;

        this.instanceId = undefined;
    }

    hasObject(candidate) {
        return this.objects.has(candidate);
    }

    configureObjects(objects) {

        this.unhighlight();

        for (let object of objects) {
            this.objects.add(object);
            this.colorDictionary[ object.uuid ] = object.material.color.clone();
        }


        this.highlight();
    }

    highlight() {
        this.objects.forEach(object => object.material.color.copy(this.highlightColor));
    }

    unhighlight() {

        this.objects.forEach(object => {
            object.material.color.copy(this.colorDictionary[ object.uuid ]);
        });

        this.objects.clear();
        this.colorDictionary = {};

    }
}

export default PickHighlighter;
