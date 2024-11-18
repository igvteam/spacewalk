import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {getRenderContainerSize, scene} from "./app.js"
import {degrees} from "./utils/mathUtils.js"

let cameraWorldDirection = new THREE.Vector3()
let crossed = new THREE.Vector3()

class CameraLightingRig extends OrbitControls {

    constructor ({ fov, near, far, domElement, aspect, hemisphereLight }) {

        super (new THREE.PerspectiveCamera(fov, aspect, near, far), domElement)

        this.attachMouseHandlers()

        // OrbitControls refers to the camera as "object"
        this.object.name = 'orbital_camera';

        this.hemisphereLight = hemisphereLight;

        this.enableDamping = true;
        this.dampingFactor = 0.05;

        // pan orthogonal to world-space direction camera.up
        this.screenSpacePanning = true;

        this.resetCamera = undefined

        // These were used with OrbitControl
        // this.enableKeys = false;
        // this.enablePan = false;

    }

    addToScene (scene) {
        scene.add( this.hemisphereLight )
    }

    attachMouseHandlers() {

        this.boundPointerUpHandler = pointerUpHandler
        this.domElement.addEventListener('pointerup', this.boundPointerUpHandler)

        function pointerUpHandler () {
            document.querySelector('#spacewalk-threejs-canvas-center-dot').style.display = 'none'
        }

        this.boundPointerDownHandler = pointerDownHandler
        this.domElement.addEventListener('pointerdown', this.boundPointerDownHandler)

        function pointerDownHandler () {
            document.querySelector('#spacewalk-threejs-canvas-center-dot').style.display = 'block'
        }

    }

    dispose() {
        // super.dispose()
        // this.removeMouseHandlers()
        scene.remove( this.hemisphereLight )
        this.hemisphereLight = undefined
    }

    removeMouseHandlers() {
        this.domElement.removeEventListener('pointerup', this.boundPointerUpHandler)
        this.domElement.removeEventListener('pointerdown', this.boundPointerDownHandler)
    }

    configure (fov, aspect, position, centroid, boundingDiameter) {

        this.setPose(position, centroid)

        const [ near, far ] = [ 1e-2 * boundingDiameter, 1e2 * boundingDiameter ];

        this.setProjection({ fov, near, far, aspect })

        // update the reset camera function
        this.resetCamera = () => {
            this.setPose(position, centroid)
            this.setProjection({ fov, near, far, aspect });
        }

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

        const { width, height } = getRenderContainerSize();
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

    }

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

    renderLoopHelper() {

        this.update();

        // Keep hemisphere light directly above trace model by transforming with camera transform
        this.object.getWorldDirection(cameraWorldDirection);
        crossed.crossVectors(cameraWorldDirection, this.object.up);
        this.hemisphereLight.position.crossVectors(crossed, cameraWorldDirection);

    }

}

function getCameraPoseAlongAxis ({ center, radius, axis, scaleFactor }) {

    const dimen = scaleFactor * radius;

    const theta = Math.atan(radius/dimen);
    const fov = degrees( 2 * theta);

    const axes =
        {
            '-x': () => {
                return new THREE.Vector3(-dimen, 0, 0);
            },
            '+x': () => {
                return new THREE.Vector3(dimen, 0, 0);
            },
            '-y': () => {
                return new THREE.Vector3(0, -dimen, 0);
            },
            '+y': () => {
                return new THREE.Vector3(0, dimen, 0);
            },
            '-z': () => {
                return new THREE.Vector3(0, 0, -dimen);
            },
            '+z': () => {
                return new THREE.Vector3(0, 0, dimen);
            },
        };

    const vector = axes[ axis ]();
    let position = new THREE.Vector3();

    position.addVectors(center, vector);

    return { target:center, position, fov }
}

export { getCameraPoseAlongAxis }
export default CameraLightingRig
