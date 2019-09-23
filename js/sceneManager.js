import * as THREE from "../node_modules/three/build/three.module.js";
import CameraLightingRig from './cameraLightingRig.js';
import Picker from "./picker.js";
import PickHighlighter from "./pickHighlighter.js";
import BallAndStick from "./ballAndStick.js";
import GroundPlane, { groundPlaneConfigurator } from './groundPlane.js';
import Gnomon, { gnomonConfigurator } from './gnomon.js';
import { guiManager, colorRampPanel } from './gui.js';
import { getMouseXY } from "./utils.js";
import { appleCrayonColorHexValue, appleCrayonColorThreeJS } from "./color.js";
import { clamp } from "./math.js";
import { globals } from "./app.js";
import EnsembleManager from "./ensembleManager.js";

const disposableSet = new Set([ 'gnomon', 'groundplane', 'point_cloud_convex_hull', 'point_cloud', 'noodle', 'ball' , 'stick' , 'noodle_spline' ]);
class SceneManager {

    constructor({ container, scene, stickMaterial, background, renderer, cameraLightingRig, picker }) {

        this.stickMaterial = stickMaterial;

        this.background = background;
        // this.background = specularCubicTexture;

        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);

        // insert rendering canvas in DOM
        container.appendChild(renderer.domElement);

        this.renderer = renderer;

        this.picker = picker;

        // stub configuration
        this.scene = scene;
        // this.scene.background = this.background;

        this.cameraLightingRig = cameraLightingRig;
        this.cameraLightingRig.addToScene(this.scene);

        $(window).on('resize.spacewalk.scenemanager', () => { this.onWindowResize() });

        $(container).on('mousemove.spacewalk.picker', (event) => {
            this.onContainerMouseMove(event)
        });

        globals.eventBus.subscribe("DidSelectSegmentID", this);
        globals.eventBus.subscribe("ColorRampMaterialProviderCanvasDidMouseMove", this);

    }

    receiveEvent({ type, data }) {

        const typeConditional = "DidSelectSegmentID" === type || "ColorRampMaterialProviderCanvasDidMouseMove" === type;

        if (typeConditional && BallAndStick.getRenderStyle() === this.renderStyle) {

            const { interpolantList } = data;

            const interpolantWindowList = EnsembleManager.getInterpolantWindowList({ trace: globals.ensembleManager.currentTrace, interpolantList });

            if (interpolantWindowList) {

                let objects = interpolantWindowList.map((interpolantWindow) => {
                    const index = globals.ensembleManager.currentTrace.colorRampInterpolantWindows.indexOf(interpolantWindow);
                    return globals.ballAndStick.balls[ index ];
                });

                this.picker.pickHighlighter.configureObjects(objects);

            }

        }
    }

    configure({ scene, min, max, boundingDiameter, cameraPosition, centroid, fov }) {

        // Scene
        this.scene = scene;
        // this.scene.background = this.background;

        // Camera Lighting Rig
        this.cameraLightingRig.configure({ fov, position: cameraPosition, centroid, boundingDiameter });
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

    setRenderStyle (renderStyle) {
        this.renderStyle = renderStyle;
    }

    ballRadius() {
        return ballStickRadiusTable[ ballRadiusTableCounter ];
    }

    stickRadius() {
        return ballStickRadiusTable[ stickRadiusTableCounter ];
    }

    updateBallRadius(increment) {
        ballRadiusTableCounter = clamp(ballRadiusTableCounter + increment, 0, ballStickRadiusTableLength - 1);
        globals.ballAndStick.updateBallRadius(this.ballRadius());
    }

    updateStickRadius(increment) {
        stickRadiusTableCounter = clamp(stickRadiusTableCounter + increment, 0, ballStickRadiusTableLength - 1);
        globals.ballAndStick.updateStickRadius(this.stickRadius());
    }

    noodleRadius() {
        return noodleRadiusTable[ noodleRadiusTableCounter ];
    }

    updateNoodleRadius(increment) {
        noodleRadiusTableCounter = clamp(noodleRadiusTableCounter + increment, 0, noodleRadiusTableLength - 1);
        globals.noodle.updateRadius(this.noodleRadius());
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

            globals.pointCloud.renderLoopHelper();

            globals.noodle.renderLoopHelper();

            globals.ballAndStick.renderLoopHelper();

            globals.dataValueMaterialProvider.renderLoopHelper();

            colorRampPanel.traceColorRampMaterialProvider.renderLoopHelper();

            this.cameraLightingRig.renderLoopHelper();

            if (this.groundPlane) {
                this.groundPlane.renderLoopHelper();
            }
            if (this.gnomon) {
                this.gnomon.renderLoopHelper();
            }

            this.renderer.render(this.scene, this.cameraLightingRig.camera);

        }

    }

}

// ball & stick radius

const maxBallStickRadius = 64;
const ballStickRadiusTableLength = 17;
const ballStickRadiusTable = ((radius) => {

    let list = [];
    for (let r = 0; r < ballStickRadiusTableLength; r++) {
        const interpolant = (1 + r)/ballStickRadiusTableLength;
        list.push(interpolant * radius);
    }
    return list;
})(maxBallStickRadius);

let ballRadiusTableCounter = Math.floor(0.5 * ballStickRadiusTableLength);
let stickRadiusTableCounter = Math.floor(0.25 * ballStickRadiusTableLength);

// noodle radius
const maxNoodleRadius = 3 * maxBallStickRadius;
const noodleRadiusTableLength = 17;
const noodleRadiusTable = ((radius) => {

    let list = [];
    for (let r = 0; r < noodleRadiusTableLength; r++) {
        const interpolant = (1 + r)/noodleRadiusTableLength;
        list.push(interpolant * radius);
    }
    return list;
})(maxNoodleRadius);

let noodleRadiusTableCounter = Math.floor(0.125 * noodleRadiusTableLength);

export const sceneManagerConfigurator = ({ container, highlightColor }) => {

    // const stickMaterial = showSMaterial;
    // const stickMaterial = new THREE.MeshBasicMaterial({ color: appleCrayonColorThreeJS('aluminum') });
    const stickMaterial = new THREE.MeshPhongMaterial({ color: appleCrayonColorThreeJS('aluminum') });
    stickMaterial.side = THREE.DoubleSide;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor (appleCrayonColorThreeJS('nickel'));

    const hemisphereLight = new THREE.HemisphereLight( appleCrayonColorHexValue('snow'), appleCrayonColorHexValue('nickel'), (1) );

    const [ fov, near, far, domElement, aspectRatio ] = [ 35, 1e2, 3e3, renderer.domElement, (window.innerWidth/window.innerHeight) ];
    const cameraLightingRig = new CameraLightingRig({ fov, near, far, domElement, aspectRatio, hemisphereLight });



    // Nice numbers
    const position = new THREE.Vector3(134820, 55968, 5715);
    const centroid = new THREE.Vector3(133394, 54542, 4288);
    cameraLightingRig.setPose({ position, newTarget: centroid });

    const background = appleCrayonColorThreeJS('nickel');
    // const background = new THREE.TextureLoader().load( 'texture/scene-background-grey-0.png' );

    const picker = new Picker( { raycaster: new THREE.Raycaster(), pickHighlighter: new PickHighlighter(highlightColor) } );

    return {
        container,
        scene: new THREE.Scene(),
        stickMaterial,
        background,
        renderer,
        cameraLightingRig,
        picker
    };

};

export default SceneManager;
