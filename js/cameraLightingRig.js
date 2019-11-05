import * as THREE from "../node_modules/three/build/three.module.js";
import OrbitControls from "./threejs_es6/orbit-controls-es6.js";

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

            this.setPose(position, centroid);
            this.doUpdateCameraPose = false;
        } else {

            // maintain the pre-existing delta between camera target and object centroid
            const delta = this.target.clone().sub(currentCentroid);
            const target = centroid.clone().add(delta);

            const toCamera = this.camera.position.clone().sub(this.target);
            const position = target.clone().add(toCamera);

            this.setPose(position, target);
        }

        const [ near, far, aspectRatio ] = [ 1e-2 * boundingDiameter, 1e2 * boundingDiameter, (window.innerWidth/window.innerHeight) ];
        this.setProjection({ fov, near, far, aspectRatio });

        currentCentroid = centroid.clone();

    }

    getState() {
        return this.camera.toJSON();
    }

    setState(json) {
        const jsonLoader = new THREE.ObjectLoader();
        this.camera = jsonLoader.parse(json);
        this.reset();
    }

    get name () {
        return this.camera.name;
    }

    setProjection({ fov, near, far, aspectRatio }) {

        // Update camera dolly range
        const delta = far - near;
        // this.minDistance = near + 1e-2 * delta;
        this.minDistance = near;
        // this.maxDistance =  far - 4e-1 * delta;

        this.camera.fov = fov;
        this.camera.aspect = aspectRatio;
        this.camera.near = near;
        this.camera.far = far;

        this.camera.updateProjectionMatrix();
    }

    setPose(position, target) {

        this.camera.lookAt(target);

        const { x, y, z } = position;
        this.camera.position.set(x, y, z);

        this.camera.updateMatrixWorld();

        this.target.copy(target);
        this.update();

    };

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

export default CameraLightingRig
