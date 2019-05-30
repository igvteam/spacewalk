import * as THREE from "../node_modules/three/build/three.module.js";
import { globalEventBus } from "./eventBus.js";

import CameraLightingRig from './cameraLightingRig.js';
import Picker from "./picker.js";
import PickHighlighter from "./pickHighlighter.js";
import BallAndStick from "./ballAndStick.js";
import GroundPlane, { groundPlaneConfigurator } from './groundPlane.js';
import Gnomon, { gnomonConfigurator } from './gnomon.js';

import { guiManager, colorRampPanel } from './gui.js';
import { dataValueMaterialProvider, noodle, ballAndStick } from "./main.js";
import { getMouseXY } from "./utils.js";
import { appleCrayonColorHexValue, appleCrayonColorThreeJS } from "./color.js";

let currentStructureCentroid = undefined;

const disposableSet = new Set([ 'gnomon', 'groundplane', 'noodle', 'ball' , 'stick' , 'noodle_spline' ]);

class SceneManager {

    constructor({ container, scene, ballRadius, stickMaterial, background, renderer, cameraLightingRig, picker, materialProvider, renderStyle }) {

        this.ballRadius = ballRadius;
        this.ballGeometry = new THREE.SphereBufferGeometry(ballRadius, 32, 16);

        this.stickMaterial = stickMaterial;

        this.background = background;
        // this.background = specularCubicTexture;

        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);

        // insert rendering canvas in DOM
        container.appendChild(renderer.domElement);

        this.renderer = renderer;

        this.picker = picker;

        this.materialProvider = materialProvider;

        this.renderStyle = renderStyle;

        // stub configuration
        this.scene = scene;
        this.scene.background = this.background;

        this.cameraLightingRig = cameraLightingRig;
        this.cameraLightingRig.addToScene(this.scene);

        $(window).on('resize.trace3d.scenemanager', () => { this.onWindowResize() });

        $(container).on('mousemove.trace3d.picker', (event) => {
            this.onContainerMouseMove(event)
        });

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

        }
    }

    configure({ scene, min, max, boundingDiameter, cameraPosition, centroid, fov }) {

        // Scene
        this.scene = scene;
        this.scene.background = this.background;

        // Camera Lighting Rig
        this.cameraLightingRig.configure({ fov, position: cameraPosition, centroid, currentStructureCentroid, boundingDiameter });
        currentStructureCentroid = centroid.clone();
        this.cameraLightingRig.addToScene(this.scene);

        // Groundplane
        if (this.groundPlane) {
            this.groundPlane.dispose();
        }

        const position = new THREE.Vector3(centroid.x, min.y, centroid.z);
        this.groundPlane = new GroundPlane(groundPlaneConfigurator(position, boundingDiameter));
        this.scene.add( this.groundPlane );

        // Gnomon
        if (this.gnomon) {
            this.gnomon.dispose();
        }

        this.gnomon = new Gnomon(gnomonConfigurator(min, max));
        this.gnomon.addToScene(this.scene);
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



    // Nice numbers
    const position = new THREE.Vector3(134820, 55968, 5715);
    const centroid = new THREE.Vector3(133394, 54542, 4288);
    cameraLightingRig.setPose({ position, centroid });

    // const background = appleCrayonColorThreeJS('nickel');
    const background = new THREE.TextureLoader().load( 'texture/scene-background-grey-0.png' );

    const picker = new Picker( { raycaster: new THREE.Raycaster(), pickHighlighter: new PickHighlighter(highlightColor) } );

    return {
        container,
        scene: new THREE.Scene(),
        ballRadius: 32,
        stickMaterial,
        background,
        renderer,
        cameraLightingRig,
        picker,
        materialProvider: colorRampPanel.colorRampMaterialProvider,
        renderStyle: guiManager.getRenderingStyle()
    };

};

export default SceneManager;
