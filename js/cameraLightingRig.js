import * as THREE from "../node_modules/three/build/three.module.js";
import OrbitControls from "./threejs_es6/orbit-controls-es6.js";

let cameraWorldDirection = new THREE.Vector3();
let crossed = new THREE.Vector3();

let currentStructureCentroid = undefined;

class CameraLightingRig extends OrbitControls {

    constructor ({ fov, near, far, domElement, aspectRatio, hemisphereLight }) {

        let camera = new THREE.PerspectiveCamera(fov, aspectRatio, near, far);

        super (camera, domElement);

        this.camera = camera;
        this.camera.name = 'orbital_camera';

        this.hemisphereLight = hemisphereLight;

        this.doUpdateCameraPose = true;

        this.enableKeys = false;
    }

    configure ({ fov, position, centroid, boundingDiameter }) {

        if (true === this.doUpdateCameraPose) {
            this.setPose({ position, centroid });
            this.doUpdateCameraPose = false;
        } else {

            // maintain the pre-existing delta between camera target and groundplane beneath stucture
            const delta = this.target.clone().sub(currentStructureCentroid);

            const _centroid = centroid.clone().add(delta);
            this.setTarget({ centroid: _centroid });
        }

        const [ near, far, aspectRatio ] = [ 1e-1 * boundingDiameter, 3e1 * boundingDiameter, (window.innerWidth/window.innerHeight) ];
        this.setProjection({ fov, near, far, aspectRatio });

        currentStructureCentroid = centroid.clone();

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

    addToScene (scene) {
        scene.add( this.camera );
        scene.add( this.hemisphereLight );
    };

    renderLoopHelper() {

        // Keep hemisphere light directly above trace model by transforming with camera transform
        this.camera.getWorldDirection(cameraWorldDirection);
        crossed.crossVectors(cameraWorldDirection, this.camera.up);
        this.hemisphereLight.position.crossVectors(crossed, cameraWorldDirection);

    }

    dispose() {
        //
        delete this.camera;
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
