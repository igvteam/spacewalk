import * as THREE from "./threejs_es6/three.module.js";
import OrbitControls from "./threejs_es6/orbit-controls-es6.js";
import { prettyVector3Print } from "./math.js";

class OrbitalCamera {

    constructor({ fov, near, far, domElement }) {

        const aspectRatio = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(fov, aspectRatio, near, far);

        this.orbitControl = new OrbitControls(this.camera, domElement);
        this.orbitControl.screenSpacePanning = false;
    }

    setProjection({ fov, near, far }) {

        this.camera.fov = fov;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.near = near;
        this.camera.far = far;

        this.camera.updateProjectionMatrix();
    }

    setPose({ position, centroid }) {
        const toCamera = position.clone().sub(centroid);
        poseHelper({ toCamera, centroid, camera: this.camera, orbitControl: this.orbitControl, delta: undefined })
    }

    setTarget({ centroid, groundPlanePosition }) {
        const toCamera = this.camera.position.clone().sub(this.orbitControl.target);
        const delta = this.orbitControl.target.clone().sub(groundPlanePosition);
        poseHelper({ toCamera, centroid, camera: this.camera, orbitControl: this.orbitControl, delta })
    }

    dispose() {
        //
        delete this.camera;

        //
        this.orbitControl.dispose();
        delete this.orbitControl;
    }
}


let poseHelper = ({ toCamera, centroid, camera, orbitControl, delta }) => {

    let _toCamera = toCamera.clone();
    let _target = centroid.clone();

    // if (delta) {
    //     prettyVector3Print('delta ', delta);
    //     _toCamera.add(delta);
    //     _target.add(delta);
    // }

    camera.lookAt(_target);

    const { x, y, z } = _target.clone().add(_toCamera);
    camera.position.set(x, y, z);

    camera.updateMatrixWorld();

    orbitControl.target = _target.clone();

    orbitControl.update();

};

export default OrbitalCamera;
