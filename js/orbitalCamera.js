import * as THREE from "../node_modules/three/build/three.module.js";
import OrbitControls from "./threejs_es6/orbit-controls-es6.js";
import { prettyVector3Print } from "./math.js";

class OrbitalCamera {

    constructor({ fov, near, far, domElement, aspectRatio }) {
        this.camera = new THREE.PerspectiveCamera(fov, aspectRatio, near, far);
        this.camera.name = 'orbital_camera';

        this.orbitControl = new OrbitControls(this.camera, domElement);
        this.orbitControl.screenSpacePanning = false;
        this.orbitControl.enableKeys = false;
    }

    get name () {
        return this.camera.name;
    }

    setProjection({ fov, near, far, aspectRatio }) {

        // Update camera dolly range
        const delta = far - near;
        this.orbitControl.minDistance = near + 1e-2 * delta;
        this.orbitControl.maxDistance =  far - 4e-1 * delta;

        this.camera.fov = fov;
        this.camera.aspect = aspectRatio;
        this.camera.near = near;
        this.camera.far = far;

        this.camera.updateProjectionMatrix();
    }

    setPose({ position, centroid }) {
        const toCamera = position.clone().sub(centroid);
        poseHelper({ toCamera, centroid, camera: this.camera, orbitControl: this.orbitControl })
    }

    setTarget({ centroid }) {
        const toCamera = this.camera.position.clone().sub(this.orbitControl.target);
        poseHelper({ toCamera, centroid, camera: this.camera, orbitControl: this.orbitControl })
    }

    dispose() {
        //
        delete this.camera;

        //
        this.orbitControl.dispose();
        delete this.orbitControl;
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

export default OrbitalCamera;
