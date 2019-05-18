import * as THREE from "../node_modules/three/build/three.module.js";
import OrbitControls from "./threejs_es6/orbit-controls-es6.js";

class CameraLightingRig extends OrbitControls {

    constructor ({ fov, near, far, domElement, aspectRatio }) {

        let camera = new THREE.PerspectiveCamera(fov, aspectRatio, near, far);

        super (camera, domElement);

        this.camera = camera;
        this.camera.name = 'orbital_camera';

        this.screenSpacePanning = false;
        this.enableKeys = false;
    }

    get name () {
        return this.camera.name;
    }

    setProjection({ fov, near, far, aspectRatio }) {

        // Update camera dolly range
        const delta = far - near;
        this.minDistance = near + 1e-2 * delta;
        this.maxDistance =  far - 4e-1 * delta;

        this.camera.fov = fov;
        this.camera.aspect = aspectRatio;
        this.camera.near = near;
        this.camera.far = far;

        this.camera.updateProjectionMatrix();
    }

    setPose({ position, centroid }) {
        const toCamera = position.clone().sub(centroid);
        poseHelper({ toCamera, centroid, camera: this.camera, orbitControl: this })
    }

    setTarget({ centroid }) {
        const toCamera = this.camera.position.clone().sub(this.target);
        poseHelper({ toCamera, centroid, camera: this.camera, orbitControl: this })
    }

    dispose() {
        //
        delete this.camera;

        //
        this.dispose();
    }

}

let poseHelper = ({ toCamera, centroid, camera, orbitControl }) => {

    let _toCamera = toCamera.clone();
    let _target = centroid.clone();

    camera.lookAt(_target);

    const { x, y, z } = _target.clone().add(_toCamera);
    camera.position.set(x, y, z);

    camera.updateMatrixWorld();

    orbitControl.target = _target.clone();

    orbitControl.update();

};

export default CameraLightingRig
