import * as THREE from './threejs/three.module.js';

class SpotLightDropShadow {
    constructor({ color, intensity, shadowSize, near, distance, angle, penumbra, doShowHelper}) {

        let spotLight = new THREE.SpotLight( color, intensity );
        spotLight.castShadow = true;
        spotLight.angle = angle;
        spotLight.penumbra = penumbra;
        spotLight.distance = distance;

        spotLight.shadow.mapSize.width = shadowSize;
        spotLight.shadow.mapSize.height = shadowSize;
        spotLight.shadow.camera.near = near;

        if (doShowHelper) {
            this.spotLightHelper = new THREE.SpotLightHelper(spotLight);
            this.shadowCameraHelper = new THREE.CameraHelper(spotLight.shadow.camera);
        }

        this.doShowHelper = doShowHelper;
        this.spotLight = spotLight;

    }

    addToScene(scene) {

        scene.add(this.spotLight.target);
        scene.add(this.spotLight);

        if (this.doShowHelper) {
            scene.add(this.spotLightHelper);
            scene.add(this.shadowCameraHelper);
        }

    }

    pose({ position, target, near, distance }) {

        this.spotLight.position.copy(position);
        this.spotLight.target.position.copy(target);

        this.spotLight.shadow.camera.near = near;
        this.spotLight.distance = distance;

    }

    update () {
        this.spotLightHelper.update();
        this.shadowCameraHelper.update();

    }
}

export default SpotLightDropShadow;
