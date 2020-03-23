import * as THREE from "../node_modules/three/build/three.module.js";
import { OrbitControls } from "../node_modules/three/examples/jsm/controls/OrbitControls.js";
import {sceneManager} from "./app.js";

let cameraWorldDirection = new THREE.Vector3();
let crossed = new THREE.Vector3();

let currentCentroid = undefined;

class CameraLightingRig extends OrbitControls {

    constructor ({ fov, near, far, domElement, aspect, hemisphereLight }) {

        super (new THREE.PerspectiveCamera(fov, aspect, near, far), domElement);

        // OrbitControls refers to the camera as "object"
        this.object.name = 'orbital_camera';

        this.hemisphereLight = hemisphereLight;

        this.doUpdateCameraPose = true;

        this.enableKeys = false;

        this.enablePan = false;

        this.enableDamping = true;

        this.dampingFactor = 0.05;

    }

    configure ({ fov, aspect, position, centroid, boundingDiameter }) {

        const [ near, far ] = [ 1e-2 * boundingDiameter, 1e2 * boundingDiameter ];

        // to set the camera in a sane pose after it has gotten mangled
        this.resetCamera = () => {
            this.setPose(position, centroid);
            this.setProjection({ fov, near, far, aspect });
            currentCentroid = centroid.clone();
        };

        if (true === this.doUpdateCameraPose) {

            this.setPose(position, centroid);

            this.doUpdateCameraPose = false;

        } else {

            // maintain the pre-existing delta between camera target and object centroid
            const delta = this.target.clone().sub(currentCentroid);
            const target = centroid.clone().add(delta);

            const toCamera = this.object.position.clone().sub(this.target);
            const position = target.clone().add(toCamera);

            this.setPose(position, target);
        }

        this.setProjection({ fov, near, far, aspect });

        currentCentroid = centroid.clone();

    }

    getState() {
        const json = this.object.toJSON();

        // Note: object.position is not included in object.toJSON (perspectiveCamera.toJSON())
        //       so it must be json'ed separately
        const { x, y, z } = this.object.position;
        json.position = { x, y, z };

        const { x:tx, y:ty, z: tz } = this.target;
        json.target = { tx, ty, tz };

        return json;
    }

    setState(json) {

        const { position:p, target:t } = json;

        const { x, y, z } = p;
        const position = new THREE.Vector3(x, y, z);

        const { tx, ty, tz } = t;
        const target = new THREE.Vector3(tx, ty, tz);

        this.setPose(position, target);

        const { fov, near, far } = json.object;

        // The aspect ratio of the json CameraLightingRig can differ from the app
        // it is being imported into. We recalculate it here.

        const { width, height } = sceneManager.getRenderContainerSize();
        this.setProjection({ fov, near, far, aspect: (width/height) });

        // const jsonLoader = new THREE.ObjectLoader();
        // this.object = jsonLoader.parse(json);
        // this.reset();
    }

    get name () {
        return this.object.name;
    }

    setPose(position, target) {

        this.object.lookAt(target);

        const { x, y, z } = position;
        this.object.position.set(x, y, z);

        this.object.updateMatrixWorld();

        this.target.copy(target);
        this.update();

    };

    setProjection({ fov, near, far, aspect }) {

        // Update camera dolly range
        const delta = far - near;
        // this.minDistance = near + 1e-2 * delta;
        this.minDistance = near;
        // this.maxDistance =  far - 4e-1 * delta;

        this.object.fov = fov;
        this.object.aspect = aspect;
        this.object.near = near;
        this.object.far = far;

        this.object.updateProjectionMatrix();
    }

    addToScene (scene) {
        scene.add( this.object );
        scene.add( this.hemisphereLight );
    };

    renderLoopHelper() {

        this.update();

        // Keep hemisphere light directly above trace model by transforming with camera transform
        this.object.getWorldDirection(cameraWorldDirection);
        crossed.crossVectors(cameraWorldDirection, this.object.up);
        this.hemisphereLight.position.crossVectors(crossed, cameraWorldDirection);

    }

    dispose() {
        //
        delete this.object;
    }

}

const createLightSource = ({ x, y, z, color, intensity }) => {

    const [ distance, decay ] = [ 0, 1 ];
    let lightSource = new THREE.PointLight(color, intensity, distance, decay);
    lightSource.position.set(x, y, z);

    return lightSource;
};

export default CameraLightingRig
