import * as THREE from "./threejs_es6/three.module.js";
import OrbitControls from "./threejs_es6/orbit-controls-es6.js";

class OrbitalCamera {

    constructor({ scene, renderer, fov, near, far, aspectRatio, domElement }) {
        this.camera = new THREE.PerspectiveCamera(fov, aspectRatio, near, far);

        this.orbitControl = new OrbitControls(this.camera, domElement);
        this.orbitControl.screenSpacePanning = false;

    }

    setNearFar(nearFar) {
        this.camera.near = nearFar[ 0 ];
        this.camera.far  = nearFar[ 1 ];
        this.camera.updateProjectionMatrix();
    }

    setPosition(xyz) {
        this.camera.position.set(xyz[ 0 ], xyz[ 1 ], xyz[ 2 ]);
    }

    setLookAt(target) {
        this.camera.lookAt(target);
        this.orbitControl.target = target;
        this.orbitControl.update();
    }

}

export default OrbitalCamera;
