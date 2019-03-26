import * as THREE from "./threejs_es6/three.module.js";
import { globalEventBus } from "./eventBus.js";
import ColorRampPalette from "./colorRampPalette.js";
import OrbitalCamera from "./orbitalCamera.js";
import { getMouseXY } from "./utils.js";
import { specularCubicTexture } from './materialLibrary.js';

class SceneManager {

    constructor({ container, ballRadius, stickMaterial, backgroundColor, groundPlaneColor, colorRampPalette, colorRampPaletteColors, renderer, picker, hemisphereLight }) {

        this.ballRadius = ballRadius;
        this.ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 16);

        this.stickMaterial = stickMaterial;

        this.background = backgroundColor;
        // this.background = specularCubicTexture;

        this.groundPlaneColor = groundPlaneColor;

        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);

        // insert rendering canvas in DOM
        container.appendChild(renderer.domElement);

        this.renderer = renderer;

        this.colorRampPalette = new ColorRampPalette({ container, palette: colorRampPalette, colors: colorRampPaletteColors, highlightColor: picker.pickHighlighter.highlightColor });

        this.picker = picker;

        this.hemisphereLight = hemisphereLight;

        // Dictionay of segment indices. Key is UUID of 3D object
        this.objectUUID2SegmentIndex = {};

        // Array of 3D objects. Index is segment index.
        this.segmentIndex2Object = [];

        $(window).on('resize.trace3d.scenemanager', () => { this.onWindowResize() });

        $(container).on('mousemove.trace3d.picker', (event) => {
            this.onContainerMouseMove(event)
        });

        globalEventBus.subscribe("PickerDidHitObject", this);
        globalEventBus.subscribe("PickerDidLeaveObject", this);
        globalEventBus.subscribe("DidSelectSegmentIndex", this);
    }

    receiveEvent({ type, data }) {
        const now = Date.now();
        if ("PickerDidHitObject" === type) {

            if (this.objectUUID2SegmentIndex[ data ]) {
                const segmentIndex = this.objectUUID2SegmentIndex[ data ].segmentIndex;
                this.colorRampPalette.genomicRampWidget.highlight(segmentIndex)
            }

        } else if ("PickerDidLeaveObject" === type) {

            this.colorRampPalette.genomicRampWidget.repaint();

        } else if ("DidSelectSegmentIndex" === type) {

            if (this.segmentIndex2Object[ data ]) {
                this.picker.pickHighlighter.configure(this.segmentIndex2Object[ data ].object);
            }

        }

    }

    defaultConfiguration() {

        this.scene = new THREE.Scene();
        this.scene.background = this.background;
        this.scene.add(this.hemisphereLight);

        const [ fov, near, far, domElement, aspectRatio ] = [ 35, 71, 22900, this.renderer.domElement, (window.innerWidth/window.innerHeight) ];
        this.orbitalCamera = new OrbitalCamera({ fov, near, far, domElement, aspectRatio });

        // Nice numbers
        const position = new THREE.Vector3(134820, 55968, 5715);
        const centroid = new THREE.Vector3(133394, 54542, 4288);
        this.orbitalCamera.setPose({ position, centroid });

        // Add camera to scene. This is need to allow lights to be attached to camera
        this.scene.add( this.orbitalCamera.camera );



        // Nice numbers
        const [ extentX, extentY, extentZ ] = [ 659, 797, 824 ];
        this.groundPlane = new THREE.GridHelper(2 * Math.max(extentX, extentY, extentZ), 16, this.groundPlaneColor, this.groundPlaneColor);
        this.groundPlane.position.set(centroid.x, centroid.y, centroid.z);
        this.groundPlane.name = 'groundplane';

        // TODO: Support toggling groundplane
        this.groundPlane.visible = false;

        this.scene.add( this.groundPlane );

    }

    configure({ chr, genomicStart, genomicEnd, structureLength, structureExtent, cameraPosition, centroid, doUpdateCameraPose }) {

        this.scene = new THREE.Scene();
        this.scene.background = this.background;
        this.scene.add(this.hemisphereLight);

        this.colorRampPalette.configure({ chr, genomicStart, genomicEnd, structureLength });

        if (true === doUpdateCameraPose) {
            this.orbitalCamera.setPose({ position: cameraPosition, centroid });
        } else {
            const delta = this.orbitalCamera.orbitControl.target.clone().sub(this.groundPlane.position);
            const _centroid = centroid.clone().add(delta);
            this.orbitalCamera.setTarget({ centroid: _centroid });
        }

        let dimen = 0.5 * Math.max(structureExtent.x, structureExtent.y, structureExtent.z);
        dimen = Math.sqrt(dimen*dimen + (2 * dimen*dimen));
        const [ fov, near, far, aspectRatio ] = [ 35, 1e-1 * dimen, 32 * dimen, (window.innerWidth/window.innerHeight) ];
        this.orbitalCamera.setProjection({ fov, near, far, aspectRatio });

        const delta = far - near;
        this.orbitalCamera.orbitControl.minDistance = near + 1e-2 * delta;
        this.orbitalCamera.orbitControl.maxDistance =  far - 4e-1 * delta;

        // Add camera to scene. This is need to allow lights to be attached to camera
        this.scene.add( this.orbitalCamera.camera );

        const thang = this.scene.getObjectByName( this.orbitalCamera.cameraName() );
        console.log('camera name ' + thang.name);

        this.groundPlane.position.set(centroid.x, centroid.y, centroid.z);
        this.scene.add( this.groundPlane );

    }

    onWindowResize() {

        this.renderer.setSize(window.innerWidth, window.innerHeight);

        this.orbitalCamera.camera.aspect = window.innerWidth/window.innerHeight;
        this.orbitalCamera.camera.updateProjectionMatrix();
    };

    onContainerMouseMove(event){

        if (this.orbitalCamera && this.orbitalCamera.camera && this.picker.isEnabled) {

            const xy = getMouseXY(this.renderer.domElement, event);

            const x =  ( xy.x / this.renderer.domElement.clientWidth  ) * 2 - 1;
            const y = -( xy.y / this.renderer.domElement.clientHeight ) * 2 + 1;

            this.picker.intersect({ x, y, scene: this.scene, camera: this.orbitalCamera.camera });

        }
    };

    dispose() {
        if (this.scene) {
            this.scene.dispose();
            delete this.scene;
        }
    }

}

export default SceneManager;
