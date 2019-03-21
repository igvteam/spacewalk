import * as THREE from "./threejs_es6/three.module.js";
import OrbitControls from "./threejs_es6/orbit-controls-es6.js";

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

    setPose({ position, target }) {

        const [ px, py, pz ] = position;
        const p = new THREE.Vector3(px, py, pz);

        const [ tx, ty, tz ] = target;
        const t = new THREE.Vector3(tx, ty, tz);

        const translation = p.clone().sub(t);

        poseHelper({ translation, target: t, camera: this.camera, orbitControl: this.orbitControl })
    }

    setTarget({ target }) {

        const [ tx, ty, tz ] = target;
        const t = new THREE.Vector3(tx, ty, tz);

        const translation = this.camera.position.clone().sub(this.orbitControl.target);

        poseHelper({ translation, target: t, camera: this.camera, orbitControl: this.orbitControl })

    }

    dispose() {
        //
        delete this.camera;

        //
        this.orbitControl.dispose();
        delete this.orbitControl;
    }
}


let poseHelper = ({ translation, target, camera, orbitControl }) => {

    camera.lookAt(target);

    const calculated = target.clone().add(translation);
    const { x, y, z } = calculated;

    camera.position.set(x, y, z);

    camera.updateMatrixWorld();

    orbitControl.target = target.clone();
    orbitControl.update();

};

export default OrbitalCamera;
