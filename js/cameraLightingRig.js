import * as THREE from "../node_modules/three/build/three.module.js";
import OrbitControls from "./threejs_es6/orbit-controls-es6.js";
import { numberFormatter } from "./utils.js";
import {prettyVector3String} from "./math.js";

let cameraWorldDirection = new THREE.Vector3();
let crossed = new THREE.Vector3();

let currentCentroid = undefined;

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
            this.setPose({ position, newTarget: centroid });
            this.doUpdateCameraPose = false;
        } else {

            // maintain the pre-existing delta between camera target and object centroid
            const delta = new THREE.Vector3();
            delta.subVectors(this.target, currentCentroid);

            const newTarget = new THREE.Vector3();
            newTarget.addVectors(centroid, delta);
            this.setTarget({ newTarget });
        }

        const [ near, far, aspectRatio ] = [ 1e-1 * boundingDiameter, 3e1 * boundingDiameter, (window.innerWidth/window.innerHeight) ];
        this.setProjection({ fov, near, far, aspectRatio });

        currentCentroid = centroid.clone();

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

    setPose({ position, newTarget }) {
        let toCamera = new THREE.Vector3();
        toCamera.subVectors(position, newTarget);
        poseHelper({ toCamera, newTarget, camera: this.camera, orbitControl: this })
    }

    setTarget({ newTarget }) {
        let toCamera = new THREE.Vector3();
        toCamera.subVectors(this.camera.position, this.target);
        poseHelper({ toCamera, newTarget, camera: this.camera, orbitControl: this })
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

let poseHelper = ({ toCamera, newTarget, camera, orbitControl }) => {

    camera.lookAt(newTarget);

    const position = new THREE.Vector3();
    position.addVectors(newTarget, toCamera);
    const { x, y, z } = position;
    camera.position.set(x, y, z);

    camera.updateMatrixWorld();

    orbitControl.target.copy(newTarget);
    orbitControl.update();

};

export default CameraLightingRig
