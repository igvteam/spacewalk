import * as THREE from './threejs_es6/three.module.js';

class SpotLightDropShadow {
    constructor({ color, intensity, shadowSize, doShowHelper}) {

        let spotLight = new THREE.SpotLight( color, intensity );

        spotLight.castShadow = true;

        // magic numbers: fov | aspectRatio | near | far
        this.shadowCamera = new THREE.PerspectiveCamera(70, 1, 8e2, 3e3);

        let lightShadow = new THREE.LightShadow( this.shadowCamera );
        lightShadow.mapSize.width = shadowSize;
        lightShadow.mapSize.height = shadowSize;

        // magic numbers
        lightShadow.radius = 1.5;
        lightShadow.bias = - 0.000222;

        spotLight.shadow = lightShadow;

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

        this.shadowCamera.near = near;
        this.shadowCamera.far = far;
        this.shadowCamera.updateProjectionMatrix();

    }
}

export default SpotLightDropShadow;
