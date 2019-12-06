import * as THREE from "../node_modules/three/build/three.module.js";
import EnsembleManager from "./ensembleManager.js";
import CameraLightingRig from './cameraLightingRig.js';
import Picker from "./picker.js";
import PickHighlighter from "./pickHighlighter.js";
import BallAndStick from "./ballAndStick.js";
import Noodle from "./noodle.js";
import PointCloud from "./pointCloud.js";
import GroundPlane, { groundPlaneConfigurator } from './groundPlane.js';
import Gnomon, { gnomonConfigurator } from './gnomon.js';
import { getMouseXY } from "./utils.js";
import { appleCrayonColorHexValue, appleCrayonColorThreeJS } from "./color.js";
import { pointCloud, noodle, ballAndStick, ensembleManager, eventBus, contactFrequencyMapPanel, distanceMapPanel } from "./app.js";
import { getGUIRenderStyle } from "./guiManager.js";

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
        this.container = container;

        this.renderer = renderer;

        this.picker = picker;

        // stub configuration
        this.scene = scene;
        // this.scene.background = this.background;

        this.cameraLightingRig = cameraLightingRig;
        this.cameraLightingRig.addToScene(this.scene);

        $(window).on('resize.spacewalk.scenemanager', () => { this.onWindowResize() });

        eventBus.subscribe("DidSelectSegmentID", this);
        eventBus.subscribe("ColorRampMaterialProviderCanvasDidMouseMove", this);
        eventBus.subscribe('DidSelectTrace', this);
        eventBus.subscribe('DidLoadEnsembleFile', this);
        eventBus.subscribe('RenderStyleDidChange', this);

    }

    receiveEvent({ type, data }) {

        const typeConditional = "DidSelectSegmentID" === type || "ColorRampMaterialProviderCanvasDidMouseMove" === type;

        if (typeConditional && BallAndStick.getRenderStyle() === this.renderStyle) {

            const { interpolantList } = data;

            const interpolantWindowList = EnsembleManager.getInterpolantWindowList({ trace: ensembleManager.currentTrace, interpolantList });

            if (interpolantWindowList) {

                let objects = interpolantWindowList.map(({ index }) => {
                    return ballAndStick.balls[ index ];
                });

                this.picker.pickHighlighter.configureObjects(objects);

            }

        } else if ('RenderStyleDidChange' === type) {

            if (data === Noodle.getRenderStyle()) {
                this.renderStyle = Noodle.getRenderStyle();
                ballAndStick.hide();
                noodle.show();
            } else {
                this.renderStyle = BallAndStick.getRenderStyle();
                noodle.hide();
                ballAndStick.show();
            }

        }  else if ('DidLoadEnsembleFile' === type) {

            this.cameraLightingRig.doUpdateCameraPose = true;

            this.renderStyle = true === ensembleManager.isPointCloud ? PointCloud.getRenderStyle() : getGUIRenderStyle();

            const { trace } = data;
            this.setupWithTrace(trace);

        } else if ('DidSelectTrace' === type) {

            const { trace } = data;
            this.setupWithTrace(trace);

        }

    }

    setupWithTrace(trace) {

        this.dispose();

        let scene = new THREE.Scene();

        if (ensembleManager.isPointCloud) {

            pointCloud.configure(trace);
            pointCloud.addToScene(scene);

        } else {

            noodle.configure(trace);
            noodle.addToScene(scene);

            ballAndStick.configure(trace);
            ballAndStick.addToScene(scene);

            contactFrequencyMapPanel.updateTraceContactFrequencyCanvas(trace);
            distanceMapPanel.updateTraceDistanceCanvas(trace);
        }

        const {min, max, center, radius} = EnsembleManager.getBoundsWithTrace(trace);
        const {position, fov} = EnsembleManager.getCameraPoseAlongAxis({ center, radius, axis: '+z', scaleFactor: 1e1 });
        this.configure({ scene, min, max, boundingDiameter: (2 * radius), cameraPosition: position, centroid: center, fov });

    }

    configure({ scene, min, max, boundingDiameter, cameraPosition, centroid, fov }) {

        // Scene
        this.scene = scene;
        // this.scene.background = this.background;

        this.cameraLightingRig.configure({fov, position: cameraPosition, centroid, boundingDiameter});

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

        this.gnomon = new Gnomon(gnomonConfigurator(min, max, boundingDiameter));
        this.gnomon.addToScene(this.scene);

        $(this.container).on('mousemove.spacewalk.picker', (event) => {

            if (true === this.picker.isEnabled) {

                const xy = getMouseXY(this.renderer.domElement, event);

                const x =  ( xy.x / this.renderer.domElement.clientWidth  ) * 2 - 1;
                const y = -( xy.y / this.renderer.domElement.clientHeight ) * 2 + 1;

                this.picker.intersect({ x, y, scene: this.scene, camera: this.cameraLightingRig.object, doTrackObject: true });

            }
        });

    }

    onWindowResize() {

        if (this.renderer && this.cameraLightingRig) {

            this.renderer.setSize(window.innerWidth, window.innerHeight);

            this.cameraLightingRig.object.aspect = window.innerWidth/window.innerHeight;
            this.cameraLightingRig.object.updateProjectionMatrix();
        }

    };

    dispose() {

        $(this.container).off('mousemove.spacewalk.picker');

        if (this.scene) {

            let disposable = this.scene.children.filter(child => {
                return disposableSet.has(child.name);
            });

            disposable.forEach(d => this.scene.remove(d));

            this.scene.dispose();
            delete this.scene;
        }
    }

    isGoodToGo() {
        return (this.scene && this.cameraLightingRig);
    }

    renderLoopHelper() {

        this.cameraLightingRig.renderLoopHelper();

        if (this.groundPlane) {
            this.groundPlane.renderLoopHelper();
        }
        if (this.gnomon) {
            this.gnomon.renderLoopHelper();
        }

        this.renderer.render(this.scene, this.cameraLightingRig.object);

    }

    getRendererClearColorState() {
        const { r, g, b } = this.renderer.getClearColor();
        return  { r, g, b }
    }

    setRendererClearColorState(json) {
        const { r, g, b } = json;
        this.renderer.setClearColor(new THREE.Color(r, g, b));
    }

    resetCamera() {
        this.cameraLightingRig.resetCamera();
    }

}

export const sceneManagerConfigurator = ({ container, highlightColor }) => {

    // const stickMaterial = showSMaterial;
    // const stickMaterial = new THREE.MeshBasicMaterial({ color: appleCrayonColorThreeJS('aluminum') });
    const stickMaterial = new THREE.MeshPhongMaterial({ color: appleCrayonColorThreeJS('aluminum') });
    stickMaterial.side = THREE.DoubleSide;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor (appleCrayonColorThreeJS('nickel'));

    const hemisphereLight = new THREE.HemisphereLight( appleCrayonColorHexValue('snow'), appleCrayonColorHexValue('nickel'), (1) );

    const [ fov, near, far, domElement, aspect ] = [ 35, 1e2, 3e3, renderer.domElement, (window.innerWidth/window.innerHeight) ];
    const cameraLightingRig = new CameraLightingRig({ fov, near, far, domElement, aspect, hemisphereLight });

    // Nice numbers
    const position = new THREE.Vector3(134820, 55968, 5715);
    const centroid = new THREE.Vector3(133394, 54542, 4288);
    cameraLightingRig.setPose(position, centroid);

    const background = appleCrayonColorThreeJS('nickel');
    // const background = new THREE.TextureLoader().load( 'texture/scene-background-grey-0.png' );

    const picker = new Picker( { raycaster: new THREE.Raycaster(), pickHighlighter: new PickHighlighter(highlightColor) } );

    return { container, scene: new THREE.Scene(), stickMaterial, background, renderer, cameraLightingRig, picker };

};

export default SceneManager;
