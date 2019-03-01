import * as THREE from "./threejs_es6/three.module.js";
import { globalEventBus } from "./main.js";
import CubicMapManager from "./cubicMapManager.js";
import ColorRampPalette from "./colorRampPalette.js";
import OrbitalCamera from "./orbitalCamera.js";
import { getMouseXY } from "./utils.js";

class SceneManager {

    constructor({ container, backgroundColor, groundPlaneColor, colorRampPaletteColors, renderer, picker }) {

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

        this.colorRampPalette = new ColorRampPalette({ container, colors: colorRampPaletteColors, highlightColor: picker.pickHighlighter.highlightColor });

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

    configure({ chr, genomicStart, genomicEnd, segmentLength, segmentExtent, cameraPosition, centroid }) {

        this.scene = new THREE.Scene();
        this.scene.background = this.background;

        this.colorRampPalette.configure({ chr, genomicStart, genomicEnd, segmentLength });

        const [ extentX, extentY, extentZ ] = segmentExtent;

        let dimen = 0.5 * Math.max(extentX, extentY, extentZ);
        dimen = Math.sqrt(dimen*dimen + (2 * dimen*dimen));

        const [ near, far, fov ] = [ 1e-1 * dimen, 32 * dimen, 35 ];
        this.configureOrbitalCamera({ fov, near, far });

        this.poseOrbitalCamera({ position: cameraPosition, lookAt: centroid });

        this.configureGroundPlane({ scene: this.scene, target: centroid, size: 2 * Math.max(extentX, extentY, extentZ), color: this.groundPlaneColor });

    }

    configureOrbitalCamera({ fov, near, far }) {
        const aspectRatio = window.innerWidth / window.innerHeight;
        const domElement = this.renderer.domElement;
        this.orbitalCamera = new OrbitalCamera({ fov, near, far, aspectRatio, domElement });
    }

    poseOrbitalCamera( { position, lookAt }) {

        this.orbitalCamera.setPosition(position);

        const [ targetX, targetY, targetZ ] = lookAt;
        this.orbitalCamera.setLookAt(new THREE.Vector3(targetX, targetY, targetZ));

    }

    configureGroundPlane({ scene, target, size, color }) {

        const groundPlane = new THREE.GridHelper(size, 16, color, color);

        const [ targetX, targetY, targetZ ] = target;
        groundPlane.position.set(targetX, targetY, targetZ);
        groundPlane.name = 'groundplane';

        scene.add( groundPlane );

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

            // console.log('clientXY(' + event.clientX + ', ' + event.clientY + ') xy(' + x + ', ' + y + ')');

            this.picker.intersect({ x, y, scene: this.scene, camera: this.orbitalCamera.camera });

        }
    };

    dispose() {

        if (this.scene) {
            this.scene.dispose();
            delete this.scene;
        }

        if (this.orbitalCamera) {
            this.orbitalCamera.dispose();
            delete this.orbitalCamera;
        }
    }

}

export default SceneManager;
