import * as THREE from './threejs_es6/three.module.js';

class SpotLightDropShadow {
    constructor({ color, intensity, shadowSize, doShowHelper}) {

        let spotLight = new THREE.SpotLight( color, intensity );

        spotLight.castShadow = true;

        spotLight.shadow.mapSize.width = shadowSize;
        spotLight.shadow.mapSize.height = shadowSize;
        spotLight.shadow.camera.near = 8e2;
        spotLight.shadow.camera.far = 3e3;

        if (doShowHelper) {
            this.shadowHelper = new THREE.CameraHelper(spotLight.shadow.camera);
        }

        this.spotLight = spotLight;

    }

    addToScene(scene) {

        scene.add(this.spotLight.target);
        scene.add(this.spotLight);

        if (this.shadowHelper) {
            scene.add(this.shadowHelper);
        }

    }

    pose({ position, target, near, far }) {

        this.spotLight.position.copy(position);
        this.spotLight.target.position.copy(target);

        this.spotLight.shadow.camera.near = near;
        this.spotLight.shadow.camera.far = far;

        this.spotLight.shadow.update(this.spotLight);

    }
}

export default SpotLightDropShadow;
