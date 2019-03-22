import * as THREE from "./threejs_es6/three.module.js";
import { globalEventBus } from "./eventBus.js";
import CubicMapManager from "./cubicMapManager.js";
import ColorRampPalette from "./colorRampPalette.js";
import OrbitalCamera from "./orbitalCamera.js";
import { numberFormatter, getMouseXY } from "./utils.js";

class SceneManager {

    constructor({ container, backgroundColor, groundPlaneColor, colorRampPalette, colorRampPaletteColors, renderer, picker }) {

        const specularCubicMapMaterialConfig =
            {
                // textureRoot: 'texture/cubic/specular/aerodynamics_workshop/',
                textureRoot: 'texture/cubic/diagnostic/threejs_format/',
                suffix: '.png',
                isSpecularMap: true
            };

        const specularCubicMapManager = new CubicMapManager(specularCubicMapMaterialConfig);

        // this.background = specularCubicMapManager.cubicTexture;
        this.background = backgroundColor;

        this.groundPlaneColor = groundPlaneColor;

        // renderer
        this.renderer = renderer;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // insert rendering canvas in DOM
        container.appendChild( this.renderer.domElement );

        this.colorRampPalette = new ColorRampPalette({ container, palette: colorRampPalette, colors: colorRampPaletteColors, highlightColor: picker.pickHighlighter.highlightColor });

        this.picker = picker;

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

        const [ fov, near, far, domElement ] = [ 35, 71, 22900, this.renderer.domElement ];
        this.orbitalCamera = new OrbitalCamera({ fov, near, far, domElement });

        const cameraPosition = new THREE.Vector3(134820, 55968, 5715);
        const centroid = new THREE.Vector3(133394, 54542, 4288);
        this.orbitalCamera.setPose({ position: cameraPosition, target: centroid });

        const [ extentX, extentY, extentZ ] = [ 659, 797, 824 ];
        this.groundPlane = new THREE.GridHelper(2 * Math.max(extentX, extentY, extentZ), 16, this.groundPlaneColor, this.groundPlaneColor);

        this.groundPlane.position.set(centroid.x, centroid.y, centroid.z);
        this.groundPlane.name = 'groundplane';

        this.scene.add( this.groundPlane );

    }

    configure({ chr, genomicStart, genomicEnd, structureLength, structureExtent, cameraPosition, centroid, doUpdateCameraPose }) {

        this.scene = new THREE.Scene();
        this.scene.background = this.background;

        this.colorRampPalette.configure({ chr, genomicStart, genomicEnd, structureLength });

        if (true === doUpdateCameraPose) {
            this.orbitalCamera.setPose({ position: cameraPosition, target: centroid });
        } else {
            this.orbitalCamera.setTarget({target: centroid});
        }

        let dimen = 0.5 * Math.max(structureExtent.x, structureExtent.y, structureExtent.z);
        dimen = Math.sqrt(dimen*dimen + (2 * dimen*dimen));
        const [ fov, near, far ] = [ 35, 1e-1 * dimen, 32 * dimen ];
        this.orbitalCamera.setProjection({ fov, near, far });

        this.groundPlane.position.set(centroid.x, centroid.y, centroid.z);
        this.scene.add( this.groundPlane );

    }

    onWindowResize() {
        this.orbitalCamera.camera.aspect = window.innerWidth / window.innerHeight;
        this.orbitalCamera.camera.updateProjectionMatrix();
        this.renderer.setSize( window.innerWidth, window.innerHeight );
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
