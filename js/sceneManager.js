import * as THREE from "../node_modules/three/build/three.module.js";
import { globalEventBus } from "./eventBus.js";

import CameraLightingRig from './cameraLightingRig.js';
import Picker from "./picker.js";
import PickHighlighter from "./pickHighlighter.js";
import BallAndStick from "./ballAndStick.js";
import Gnomon from './gnomon.js';

import { guiManager, colorRampPanel } from './gui.js';
import { dataValueMaterialProvider, noodle, ballAndStick } from "./main.js";
import { getMouseXY } from "./utils.js";
import { prettyVector3Print } from "./math.js";
import { appleCrayonColorHexValue, appleCrayonColorThreeJS } from "./color.js";

let currentStructureCentroid = undefined;

const disposableSet = new Set([ 'groundplane', 'noodle', 'ball' , 'stick' , 'noodle_spline' ]);

class SceneManager {

    constructor({ container, ballRadius, stickMaterial, background, groundPlaneColor, renderer, cameraLightingRig, picker, materialProvider, isGroundplaneHidden, renderStyle }) {

        this.doUpdateCameraPose = true;

        this.ballRadius = ballRadius;
        this.ballGeometry = new THREE.SphereBufferGeometry(ballRadius, 32, 16);

        this.stickMaterial = stickMaterial;

        this.background = background;
        // this.background = specularCubicTexture;

        this.groundPlaneColor = groundPlaneColor;

        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);

        // insert rendering canvas in DOM
        container.appendChild(renderer.domElement);

        this.cameraLightingRig = cameraLightingRig;

        this.renderer = renderer;

        this.picker = picker;

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

        // Nice numbers
        const position = new THREE.Vector3(134820, 55968, 5715);
        const centroid = new THREE.Vector3(133394, 54542, 4288);
        this.cameraLightingRig.setPose({ position, centroid });

        this.cameraLightingRig.addToScene(this.scene);

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

        if (true === this.doUpdateCameraPose) {
            this.cameraLightingRig.setPose({ position: cameraPosition, centroid: centroid });
        } else {

            // maintain the pre-existing delta between camera target and groundplane beneath stucture
            const delta = this.cameraLightingRig.target.clone().sub(currentStructureCentroid);

            const _centroid = centroid.clone().add(delta);
            this.cameraLightingRig.setTarget({ centroid: _centroid });
        }

        currentStructureCentroid = centroid.clone();

        const [ near, far, aspectRatio ] = [ 1e-1 * boundingDiameter, 3e1 * boundingDiameter, (window.innerWidth/window.innerHeight) ];
        this.cameraLightingRig.setProjection({ fov, near, far, aspectRatio });

        this.cameraLightingRig.addToScene(this.scene);

        // groundplane
        this.groundPlane.geometry.dispose();
        this.groundPlane.material.dispose();

        this.groundPlane = new THREE.GridHelper(boundingDiameter, 16, this.groundPlaneColor, this.groundPlaneColor);

        this.groundPlane.name = 'groundplane';
        this.groundPlane.visible = this.isGroundplaneHidden;

        this.groundPlane.material.opacity = 0.25;
        this.groundPlane.material.transparent = true;

        // const dy = (min.y - centroid.y);
        const [ dx, dy, dz ] = [ min.x - centroid.x, min.y - centroid.y, min.z - centroid.z ];
        this.groundPlane.position.set(centroid.x, (centroid.y + dy), centroid.z);

        this.scene.add( this.groundPlane );


        // axes helper
        // const axesHelper = new THREE.AxesHelper( boundingDiameter );
        // axesHelper.position.set((centroid.x + dx), (centroid.y + dy), (centroid.z + dz));
        // this.scene.add( axesHelper );

        const config =
            {
                origin: new THREE.Vector3(min.x, min.y, min.z),
                xLength: max.x - min.x,
                yLength: max.y - min.y,
                zLength: max.z - min.z,
                color: appleCrayonColorThreeJS('magenta')
            };
        const gnomon = new Gnomon(config);

        this.scene.add( gnomon );
    }

    onWindowResize() {

        this.renderer.setSize(window.innerWidth, window.innerHeight);

        this.cameraLightingRig.camera.aspect = window.innerWidth/window.innerHeight;
        this.cameraLightingRig.camera.updateProjectionMatrix();
    };

    onContainerMouseMove(event){

        if (this.cameraLightingRig && this.cameraLightingRig.camera && this.picker.isEnabled) {

            const xy = getMouseXY(this.renderer.domElement, event);

            const x =  ( xy.x / this.renderer.domElement.clientWidth  ) * 2 - 1;
            const y = -( xy.y / this.renderer.domElement.clientHeight ) * 2 + 1;

            this.picker.intersect({ x, y, scene: this.scene, camera: this.cameraLightingRig.camera, doTrackObject: true });

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

    render () {

        if (this.scene && this.cameraLightingRig) {

            noodle.renderLoopHelper();

            ballAndStick.renderLoopHelper();

            dataValueMaterialProvider.renderLoopHelper();

            this.materialProvider.renderLoopHelper();

            this.cameraLightingRig.renderLoopHelper();

            this.renderer.render(this.scene, this.cameraLightingRig.camera);

        }

    }

}

export const sceneManagerConfigurator = ({ container, highlightColor }) => {

    // const stickMaterial = showSMaterial;
    // const stickMaterial = new THREE.MeshBasicMaterial({ color: appleCrayonColorThreeJS('aluminum') });
    const stickMaterial = new THREE.MeshPhongMaterial({ color: appleCrayonColorThreeJS('aluminum') });
    stickMaterial.side = THREE.DoubleSide;

    const renderer = new THREE.WebGLRenderer({ antialias: true });

    const hemisphereLight = new THREE.HemisphereLight( appleCrayonColorHexValue('snow'), appleCrayonColorHexValue('nickel'), (1) );

    const [ fov, near, far, domElement, aspectRatio ] = [ 35, 1e2, 3e3, renderer.domElement, (window.innerWidth/window.innerHeight) ];
    const cameraLightingRig = new CameraLightingRig({ fov, near, far, domElement, aspectRatio, hemisphereLight });

    // const background = appleCrayonColorThreeJS('nickel');
    const background = new THREE.TextureLoader().load( 'texture/scene-background-grey-0.png' );

    const groundPlaneColor = appleCrayonColorThreeJS('mercury');

    const picker = new Picker( { raycaster: new THREE.Raycaster(), pickHighlighter: new PickHighlighter(highlightColor) } );

    return {
            container,
            ballRadius: 32,
            stickMaterial,
            background,
            groundPlaneColor,
            renderer,
            cameraLightingRig,
            picker,
            materialProvider: colorRampPanel.colorRampMaterialProvider,
            isGroundplaneHidden: guiManager.isGroundplaneHidden($('#spacewalk_ui_manager_panel')),
            renderStyle: guiManager.getRenderingStyle()
        };

};

export default SceneManager;
