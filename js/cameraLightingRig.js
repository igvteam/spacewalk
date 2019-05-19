import * as THREE from "../node_modules/three/build/three.module.js";
import OrbitControls from "./threejs_es6/orbit-controls-es6.js";
import { appleCrayonColorHexValue } from "./color.js";

class CameraLightingRig extends OrbitControls {

    constructor ({ fov, near, far, domElement, aspectRatio }) {

        let camera = new THREE.PerspectiveCamera(fov, aspectRatio, near, far);

        super (camera, domElement);

        this.camera = camera;
        this.camera.name = 'orbital_camera';

        // key
        // this.camera.add(createLightSource({ x: -1000, y: 1000, z: -100, color: appleCrayonColorHexValue('snow'), intensity: (3.0/5.0) }));

        // fill
        // this.camera.add(createLightSource({ x: 3000, y: 100, z: 100, color: appleCrayonColorHexValue('snow'), intensity: (2.0/5.0) }));

        // rim
        // this.camera.add(createLightSource({ x: 0, y: 500, z: -10000, color: appleCrayonColorHexValue('snow'), intensity: (1.0) }));


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

const createLightSource = ({ x, y, z, color, intensity }) => {

    const [ distance, decay ] = [ 0, 1 ];
    let lightSource = new THREE.PointLight(color, intensity, distance, decay);
    lightSource.position.set(x, y, z);

    return lightSource;
};

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
