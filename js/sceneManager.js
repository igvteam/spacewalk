import * as THREE from "./threejs_es6/three.module.js";
import { globalEventBus } from "./eventBus.js";

import OrbitalCamera from "./orbitalCamera.js";
import Picker from "./picker.js";
import PickHighlighter from "./pickHighlighter.js";
import Noodle from "./noodle.js";
import BallAndStick from "./ballAndStick.js";

import { guiManager, ballAndStick, colorRampPanel } from "./main.js";
import { getMouseXY } from "./utils.js";
import {appleCrayonColorHexValue, appleCrayonColorThreeJS} from "./color.js";

let currentStructureCentroid = undefined;

const disposableSet = new Set([ 'groundplane', 'noodle', 'ball' , 'stick' , 'noodle_spline' ]);

class SceneManager {

    constructor({ container, ballRadius, stickMaterial, backgroundColor, groundPlaneColor, renderer, picker, hemisphereLight, materialProvider, isGroundplaneHidden, renderStyle }) {

        this.doUpdateCameraPose = true;

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

        this.picker = picker;

        this.hemisphereLight = hemisphereLight;

        this.materialProvider = materialProvider;

        this.isGroundplaneHidden = isGroundplaneHidden;

        this.renderStyle = renderStyle;

        $(window).on('resize.trace3d.scenemanager', () => { this.onWindowResize() });

        $(container).on('mousemove.trace3d.picker', (event) => {
            this.onContainerMouseMove(event)
        });

        globalEventBus.subscribe("ToggleGroundplane", this);
        globalEventBus.subscribe("DidSelectSegmentIndex", this);
    }


    receiveEvent({ type, data }) {

        if ("DidSelectSegmentIndex" === type && BallAndStick.getRenderStyle() === this.renderStyle) {

            let objects = [];
            data.segmentIndexList.forEach(item => {
                const index = item - 1;
                if (ballAndStick.objectList[ index ]) {
                    let { object } = ballAndStick.objectList[ index ];
                    objects.push(object);
                }
            });

            if (objects.length > 0) {
                this.picker.pickHighlighter.configureObjects(objects);
            }


        } else if ("ToggleGroundplane" === type) {
            this.isGroundplaneHidden = data;
            this.groundPlane.visible = this.isGroundplaneHidden;
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
        const dimen = 2 * Math.max(extentX, extentY, extentZ);
        this.groundPlane = new THREE.GridHelper(dimen, 16, this.groundPlaneColor, this.groundPlaneColor);

        this.groundPlane.name = 'groundplane';
        this.groundPlane.visible = this.isGroundplaneHidden;

        this.groundPlane.material.opacity = 0.25;
        this.groundPlane.material.transparent = true;

        this.groundPlane.position.set(centroid.x, centroid.y, centroid.z);

        this.scene.add( this.groundPlane );

    }

    configure({ scene, min, max, boundingDiameter, cameraPosition, centroid, fov }) {

        this.scene = scene;
        this.scene.background = this.background;

        this.scene.add(this.hemisphereLight);

        if (true === this.doUpdateCameraPose) {
            this.orbitalCamera.setPose({ position: cameraPosition, centroid: centroid });
        } else {

            // maintain the pre-existing delta between camera target and groundplane beneath stucture
            const delta = this.orbitalCamera.orbitControl.target.clone().sub(currentStructureCentroid);

            const _centroid = centroid.clone().add(delta);
            this.orbitalCamera.setTarget({ centroid: _centroid });
        }

        currentStructureCentroid = centroid.clone();

        const [ near, far, aspectRatio ] = [ 1e-1 * boundingDiameter, 3e1 * boundingDiameter, (window.innerWidth/window.innerHeight) ];

        this.orbitalCamera.setProjection({ fov, near, far, aspectRatio });

        // Add camera to scene. This is need to allow lights to be attached to camera
        this.scene.add( this.orbitalCamera.camera );

        // groundplane
        this.groundPlane.geometry.dispose();
        this.groundPlane.material.dispose();

        this.groundPlane = new THREE.GridHelper(boundingDiameter, 16, this.groundPlaneColor, this.groundPlaneColor);

        this.groundPlane.name = 'groundplane';
        this.groundPlane.visible = this.isGroundplaneHidden;

        this.groundPlane.material.opacity = 0.25;
        this.groundPlane.material.transparent = true;

        const dy = (min.y - centroid.y);
        this.groundPlane.position.set(centroid.x, (centroid.y + dy), centroid.z);

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

            this.picker.intersect({ x, y, scene: this.scene, camera: this.orbitalCamera.camera, doTrackObject: true });

        }
    };

    dispose() {
        if (this.scene) {

            let disposable = this.scene.children.filter(child => {
                // return 'noodle' === child.name || 'ball' === child.name || 'stick' === child.name || 'noodle_spline' === child.name
                return disposableSet.has(child.name);
            });

            disposable.forEach(d => this.scene.remove(d));

            this.scene.dispose();
            delete this.scene;
        }
    }

}

export const defaultColormapName = 'peter_kovesi_rainbow_bgyr_35_85_c72_n256';

export const sceneManagerConfigurator = ({ container, highlightColor }) => {

    // const stickMaterial = showSMaterial;
    // const stickMaterial = new THREE.MeshBasicMaterial({ color: appleCrayonColorThreeJS('aluminum') });
    const stickMaterial = new THREE.MeshPhongMaterial({ color: appleCrayonColorThreeJS('aluminum') });
    stickMaterial.side = THREE.DoubleSide;

    return {
            container,
            ballRadius: 32,
            stickMaterial,
            // backgroundColor: appleCrayonColorThreeJS('mercury'),
            backgroundColor: appleCrayonColorThreeJS('snow'),
            groundPlaneColor: appleCrayonColorThreeJS('steel'),
            renderer: new THREE.WebGLRenderer({ antialias: true }),
            picker: new Picker( { raycaster: new THREE.Raycaster(), pickHighlighter: new PickHighlighter(highlightColor) } ),
            // skyColor | groundColor | intensity
            hemisphereLight: new THREE.HemisphereLight( appleCrayonColorHexValue('snow'), appleCrayonColorHexValue('nickel'), 1 ),
            materialProvider: colorRampPanel.colorRampMaterialProvider,
            isGroundplaneHidden: guiManager.isGroundplaneHidden($('#trace3d_ui_manager_panel')),
            renderStyle: guiManager.getRenderingStyle()
        };

};

export default SceneManager;
