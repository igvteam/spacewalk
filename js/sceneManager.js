import * as THREE from "./threejs_es6/three.module.js";
import { globalEventBus } from "./eventBus.js";
import OrbitalCamera from "./orbitalCamera.js";
import { getMouseXY } from "./utils.js";
import { specularCubicTexture } from './materialLibrary.js';
import {appleCrayonColorHexValue, appleCrayonColorRGB255, appleCrayonColorThreeJS} from "./color.js";
import ColorRampPanel from "./colorRampPanel.js";
import Picker from "./picker.js";
import PickHighlighter from "./pickHighlighter.js";
import ColorTableManager from "./colorTableManager.js";

let currentStructureCentroid = undefined;

class SceneManager {

    constructor({ container, ballRadius, stickMaterial, backgroundColor, groundPlaneColor, colorRampPanel, renderer, picker, hemisphereLight }) {

        this.ballRadius = ballRadius;
        this.ballGeometry = new THREE.SphereBufferGeometry(ballRadius, 32, 16);

        this.stickMaterial = stickMaterial;

        this.background = backgroundColor;
        // this.background = specularCubicTexture;

        this.groundPlaneColor = groundPlaneColor;

        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);

        // insert rendering canvas in DOM
        container.appendChild(renderer.domElement);

        this.renderer = renderer;

        this.colorRampPanel = colorRampPanel;

        this.picker = picker;

        this.hemisphereLight = hemisphereLight;

        // Dictionay of segment indices. Key is UUID of 3D object
        this.indexDictionary = {};

        // Array of 3D objects. Index is segment index.
        this.objectList = [];

        $(window).on('resize.trace3d.scenemanager', () => { this.onWindowResize() });

        $(container).on('mousemove.trace3d.picker', (event) => {
            this.onContainerMouseMove(event)
        });

        globalEventBus.subscribe("ToggleGroundplane", this);
        globalEventBus.subscribe("PickerDidHitObject", this);
        globalEventBus.subscribe("PickerDidLeaveObject", this);
        globalEventBus.subscribe("DidSelectSegmentIndex", this);
    }

    receiveEvent({ type, data }) {
        const now = Date.now();
        if ("PickerDidHitObject" === type) {

            if (this.indexDictionary[ data ]) {
                const segmentIndex = 1 + this.indexDictionary[ data ].index;
                this.colorRampPanel.genomicRampWidget.highlight(segmentIndex)
            }

        } else if ("PickerDidLeaveObject" === type) {

            this.colorRampPanel.genomicRampWidget.repaint();

        } else if ("DidSelectSegmentIndex" === type) {

            const index = data - 1;
            if (this.objectList[ index ]) {
                this.picker.pickHighlighter.configure(this.objectList[ index ].object);
            }

        } else if ("ToggleGroundplane" === type) {
            this.groundPlane.visible = data;
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

        this.groundPlane.material.opacity = 0.25;
        this.groundPlane.material.transparent = true;

        this.groundPlane.position.set(centroid.x, centroid.y, centroid.z);

        this.groundPlane.name = 'groundplane';

        // TODO: Support toggling groundplane
        this.groundPlane.visible = false;

        this.scene.add( this.groundPlane );

    }

    configure({ chr, genomicStart, genomicEnd, structureLength, structureExtent, cameraPosition, structureCentroid, doUpdateCameraPose }) {

        this.scene = new THREE.Scene();
        this.scene.background = this.background;
        this.scene.add(this.hemisphereLight);

        this.colorRampPanel.configure({ genomicStart, genomicEnd, structureLength });

        if (true === doUpdateCameraPose) {
            this.orbitalCamera.setPose({ position: cameraPosition, centroid: structureCentroid });
        } else {

            // maintain the pre-existing delta between camera target and groundplane beneath stucture
            const delta = this.orbitalCamera.orbitControl.target.clone().sub(currentStructureCentroid);

            const _centroid = structureCentroid.clone().add(delta);
            this.orbitalCamera.setTarget({ centroid: _centroid });
        }

        currentStructureCentroid = structureCentroid.clone();

        let dimen = 0.5 * Math.max(structureExtent.x, structureExtent.y, structureExtent.z);
        dimen = Math.sqrt(dimen*dimen + (2 * dimen*dimen));
        const [ fov, near, far, aspectRatio ] = [ 35, 1e-1 * dimen, 32 * dimen, (window.innerWidth/window.innerHeight) ];
        this.orbitalCamera.setProjection({ fov, near, far, aspectRatio });

        // Add camera to scene. This is need to allow lights to be attached to camera
        this.scene.add( this.orbitalCamera.camera );

        // const thang = this.scene.getObjectByName( 'groundplane' );
        // console.log('groundplane ' + thang.name);

        // position groundplane beneath structure along the vertical (y) axis.
        let wye = structureCentroid.y - (structureExtent.y/2.0);

        const fudge = 4e-2;
        wye -= fudge * structureExtent.y;
        this.groundPlane.position.set(structureCentroid.x, wye, structureCentroid.z);

        this.scene.add( this.groundPlane );

        // Dictionay of segment indices. Key is UUID of 3D object
        this.indexDictionary = {};

        // Array of 3D objects. Index is segment index.
        this.objectList = [];


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

export const sceneManagerConfigurator = (container) => {

    let colorTableManager = new ColorTableManager();

    const name = 'kenneth_moreland_smooth_cool_warm';
    const path = 'resource/colortables/kenneth_moreland/smooth-cool-warm-table-byte-1024.csv';

    colorTableManager.addTable({ name, path });

    // const highlightColor = appleCrayonColorThreeJS('maraschino');
    const highlightColor = appleCrayonColorThreeJS('honeydew');

    const colorRampPanelConfig =
        {
            container,
            panel: $('#trace3d_color_ramp_panel').get(0),
            colorTableManager,
            highlightColor
        };

    const config =
        {
            container: container,

            ballRadius: 24,

            stickMaterial: new THREE.MeshPhongMaterial({ color: appleCrayonColorThreeJS('aluminum') }),

            backgroundColor: appleCrayonColorThreeJS('mercury'),

            groundPlaneColor: appleCrayonColorHexValue('steel'),

            colorRampPanel: new ColorRampPanel(colorRampPanelConfig),

            renderer: new THREE.WebGLRenderer({ antialias: true }),

            picker: new Picker( { raycaster: new THREE.Raycaster(), pickHighlighter: new PickHighlighter(highlightColor) } ),

            // skyColor | groundColor | intensity
            hemisphereLight: new THREE.HemisphereLight( appleCrayonColorHexValue('snow'), appleCrayonColorHexValue('nickel'), 1 )
        };

    return config;
};

export default SceneManager;
