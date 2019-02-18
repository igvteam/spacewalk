import * as THREE from "./threejs_es6/three.module.js";
import { globalEventBus } from "./main.js";

import CubicMapManager from "./cubicMapManager.js";
import ToolPalette from "./toolPalette.js";
import OrbitalCamera from "./orbitalCamera.js";

import { appleCrayonColorHexValue, appleCrayonColorThreeJS, appleCrayonColorRGB255 } from "./color.js";
import { getMouseXY } from "./utils.js";

class SceneManager {

    constructor({ container, scene, renderer, picker }) {


        // scene
        this.scene = scene;

        const specularCubicMapMaterialConfig =
            {
                // textureRoot: 'texture/cubic/specular/aerodynamics_workshop/',
                textureRoot: 'texture/cubic/diagnostic/threejs_format/',
                suffix: '.png',
                isSpecularMap: true
            };

        const specularCubicMapManager = new CubicMapManager(specularCubicMapMaterialConfig);

        // const colorName = 'mercury';
        const colorName = 'cantaloupe';

        // this.scene.background = specularCubicMapManager.cubicTexture;
        this.scene.background = appleCrayonColorThreeJS(colorName);


        // renderer
        this.renderer = renderer;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        this.renderer.setClearColor(appleCrayonColorHexValue(colorName));

        // insert rendering canvas in DOM
        container.appendChild( this.renderer.domElement );

        // attach tool palette

        const colors = [ appleCrayonColorRGB255('honeydew'), appleCrayonColorRGB255('clover') ];
        this.toolPalette = new ToolPalette({ container, colors, highlightColor: picker.pickHighlighter.highlightColor });

        this.picker = picker;

        $(window).on('resize.trace3d.scenemanager', () => { this.onWindowResize() });

        $(container).on('mousemove.trace3d.picker', (event) => {
            this.onContainerMouseMove(event)
        });

        globalEventBus.subscribe("PickerDidHitObject", this);
        globalEventBus.subscribe("PickerDidLeaveObject", this);
        globalEventBus.subscribe("RampWidgetDidSelectSegmentIndex", this);
    }

    receiveEvent({ type, data }) {
        const now = Date.now();
        if ("PickerDidHitObject" === type) {

            if (this.objectUUID2SegmentIndex[ data ]) {
                const segmentIndex = this.objectUUID2SegmentIndex[ data ].segmentIndex;
                this.toolPalette.genomicRampWidget.highlight(segmentIndex)
            }

        } else if ("PickerDidLeaveObject" === type) {

            this.toolPalette.genomicRampWidget.repaint();

        } else if ("RampWidgetDidSelectSegmentIndex" === type) {

            if (this.segmentIndex2Object[ data ]) {
                this.picker.pickHighlighter.configure(this.segmentIndex2Object[ data ].object);
            }

        }

    }

    configure({ chr, genomicStart, genomicEnd, segment }) {

        this.toolPalette.configure({ chr, genomicStart, genomicEnd, segmentLength:segment.length });

        const [ extentX, extentY, extentZ ] = segment.extent;

        let dimen = 0.5 * Math.max(extentX, extentY, extentZ);
        dimen = Math.sqrt(dimen*dimen + (2 * dimen*dimen));

        const [ near, far, fov ] = [ 1e-1 * dimen, 32 * dimen, 35 ];
        this.configureOrbitalCamera({ fov, near, far });

        this.poseOrbitalCamera({ position: segment.cameraPosition, lookAt: segment.centroid });

        this.configureGroundPlane({ target: segment.centroid, size: 2 * Math.max(extentX, extentY, extentZ), color: appleCrayonColorHexValue('steel') });

    }

    configureOrbitalCamera({ fov, near, far }) {

        const scene = this.scene;
        const renderer = this.renderer;
        const aspectRatio = window.innerWidth / window.innerHeight;
        const domElement = this.renderer.domElement;
        this.orbitalCamera = new OrbitalCamera({ scene, renderer, fov, near, far, aspectRatio, domElement });

    }

    poseOrbitalCamera( { position, lookAt }) {

        this.orbitalCamera.setPosition(position);

        const [ targetX, targetY, targetZ ] = lookAt;
        this.orbitalCamera.setLookAt(new THREE.Vector3(targetX, targetY, targetZ));

    }

    configureGroundPlane({ target, size, color }) {

        const groundPlane = new THREE.GridHelper(size, 16, color, color);

        const [ targetX, targetY, targetZ ] = target;
        groundPlane.position.set(targetX, targetY, targetZ);
        groundPlane.name = 'groundplane';

        this.scene.add( groundPlane );

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


}

export default SceneManager;
