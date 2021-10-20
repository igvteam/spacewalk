import EnsembleManager from "./ensembleManager.js";
import { EventBus } from 'igv-widgets'
import * as THREE from "three";
import CameraLightingRig from './cameraLightingRig.js';
import Picker from "./picker.js";
import BallAndStick from "./ballAndStick.js";
import PointCloud from "./pointCloud.js";
import GroundPlane, { groundPlaneConfigurator } from './groundPlane.js';
import Gnomon, { gnomonConfigurator } from './gnomon.js';
import { getMouseXY } from "./utils.js";
import { appleCrayonColorThreeJS } from "./color.js";
import { pointCloud, ribbon, ballAndStick, ensembleManager, contactFrequencyMapPanel, distanceMapPanel, sceneManager } from "./app.js";
import { getGUIRenderStyle, configureColorPicker } from "./guiManager.js";
import { specularCubicTexture, sceneBackgroundTexture, sceneBackgroundDiagnosticTexture } from "./materialLibrary.js";
import Ribbon from './ribbon.js'

const disposableSet = new Set([ 'gnomon', 'groundplane', 'ribbon', 'ball' , 'stick' ]);

let mouseX = undefined
let mouseY = undefined

class SceneManager {

    constructor({ container, scene, stickMaterial, background, renderer, cameraLightingRig, picker }) {

        this.stickMaterial = stickMaterial;

        this.background = background;

        renderer.setPixelRatio(window.devicePixelRatio);
        const { width, height } = container.getBoundingClientRect();
        renderer.setSize(width, height);

        // insert rendering canvas in DOM
        container.appendChild(renderer.domElement);
        this.container = container;

        this.renderer = renderer;

        this.picker = picker;

        // stub configuration
        this.scene = scene;

        this.cameraLightingRig = cameraLightingRig;
        this.cameraLightingRig.addToScene(this.scene);

        EventBus.globalBus.subscribe('DidSelectTrace', this);
        EventBus.globalBus.subscribe('DidLoadEnsembleFile', this);
        EventBus.globalBus.subscribe('RenderStyleDidChange', this);


    }

    getRenderContainerSize() {
        const { width, height } = this.container.getBoundingClientRect();
        return { width, height };
    }

    receiveEvent({ type, data }) {

        if ('RenderStyleDidChange' === type) {

            if (data === Ribbon.getRenderStyle()) {
                this.renderStyle = Ribbon.getRenderStyle()
                ballAndStick.hide()
                ribbon.show()
            } else if (data === BallAndStick.getRenderStyle()) {
                this.renderStyle = BallAndStick.getRenderStyle()
                ribbon.hide()
                ballAndStick.show()
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

            ribbon.configure(trace);
            ribbon.addToScene(scene);

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
        this.scene.background = this.background;

        const { width, height } = this.getRenderContainerSize();
        this.cameraLightingRig.configure({fov, aspect: width/height, position: cameraPosition, centroid, boundingDiameter});

        this.cameraLightingRig.addToScene(this.scene);

        // Groundplane
        if (this.groundPlane) {
            this.groundPlane.dispose();
        }

        this.groundPlane = new GroundPlane(groundPlaneConfigurator(new THREE.Vector3(centroid.x, min.y, centroid.z), boundingDiameter));
        this.scene.add( this.groundPlane );

        configureColorPicker($(`input[data-colorpicker='groundplane']`), this.groundPlane.color, color => this.groundPlane.setColor(color));

        // Gnomon
        if (this.gnomon) {
            this.gnomon.dispose();
        }

        this.gnomon = new Gnomon(gnomonConfigurator(min, max, boundingDiameter));
        this.gnomon.addToScene(this.scene);

        configureColorPicker($(`input[data-colorpicker='gnomon']`), this.gnomon.color, color => this.gnomon.setColor(color));

        $(this.container).on('mousemove.spacewalk.picker', (event) => {

            const { x, y } = getMouseXY(this.renderer.domElement, event);
            mouseX =  ( x / this.renderer.domElement.clientWidth  ) * 2 - 1;
            mouseY = -( y / this.renderer.domElement.clientHeight ) * 2 + 1;

        });

    }

    resizeContainer() {

        if (this.renderer && this.cameraLightingRig) {

            const { width, height } = this.getRenderContainerSize();
            this.renderer.setSize(width, height);

            this.cameraLightingRig.object.aspect = width/height;
            this.cameraLightingRig.object.updateProjectionMatrix();
        }

    }

    dispose() {

        $(this.container).off('mousemove.spacewalk.picker')
        mouseX = mouseY = undefined

        if (this.scene) {

            let disposable = this.scene.children.filter(child => disposableSet.has(child.name))

            for (let d of disposable) {
                this.scene.remove(d)
            }

            delete this.scene
        }

    }

    isGoodToGo() {
        return this.scene && this.cameraLightingRig
    }

    renderLoopHelper() {

        this.cameraLightingRig.renderLoopHelper();

        if (this.groundPlane) {
            this.groundPlane.renderLoopHelper();
        }

        if (this.gnomon) {
            this.gnomon.renderLoopHelper();
        }

        this.picker.intersect({ x:mouseX, y:mouseY, scene:this.scene, camera:this.cameraLightingRig.object });

        this.renderer.render(this.scene, this.cameraLightingRig.object)

    }

    setBackground(rgbJS) {
        this.background = rgbJS;
        this.scene.background = this.background;
    }

    getBackgroundState() {

        if (true === this.scene.background.isColor) {
            const { r, g, b } = this.scene.background;
            return  { r, g, b }
        } else if (true === this.scene.background.isTexture) {
            return 'sceneBackgroundTexture';
        } else {
            console.log('dunno');
        }

    }

    setBackgroundState(json) {

        if ('string' === typeof json) {
            this.background = sceneBackgroundTexture;
            this.scene.background = this.background;
        } else if ('object' === typeof json) {
            const { r, g, b } = json;
            this.setBackground(new THREE.Color(r, g, b));
        } else {
            console.log('dunno');
        }
    }

    resetCamera() {
        this.cameraLightingRig.resetCamera();
    }

}

const sceneManagerConfigurator = ({ container, highlightColor }) => {

    const str = `Scene Manager Configuration Builder Complete`;
    console.time(str);

    // const stickMaterial = showSMaterial;
    // const stickMaterial = new THREE.MeshBasicMaterial({ color: appleCrayonColorThreeJS('aluminum') });
    const stickMaterial = new THREE.MeshPhongMaterial({ color: appleCrayonColorThreeJS('aluminum') });
    stickMaterial.side = THREE.DoubleSide;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    // renderer.setClearColor (appleCrayonColorThreeJS('nickel'));
    // renderer.setClearColor (appleCrayonColorThreeJS('strawberry'));

    // const hemisphereLight = new THREE.HemisphereLight( appleCrayonColorThreeJS('snow'), appleCrayonColorThreeJS('nickel'), (1) );
    const hemisphereLight = new THREE.HemisphereLight( appleCrayonColorThreeJS('snow'), appleCrayonColorThreeJS('tin'), (1) );

    const { width, height } = container.getBoundingClientRect();
    const [ fov, near, far, domElement, aspect ] = [ 35, 1e2, 3e3, renderer.domElement, (width/height) ];
    const cameraLightingRig = new CameraLightingRig({ fov, near, far, domElement, aspect, hemisphereLight });

    // Nice numbers
    const position = new THREE.Vector3(134820, 55968, 5715);
    const centroid = new THREE.Vector3(133394, 54542, 4288);
    cameraLightingRig.setPose(position, centroid);

    // const background = appleCrayonColorThreeJS('nickel');
    const background = sceneBackgroundTexture;
    // const background = specularCubicTexture;

    const scene = new THREE.Scene();
    scene.background = background;

    const picker = new Picker( { raycaster: new THREE.Raycaster(), pickerHighlighterDictionary: { ballHighlighter: ballAndStick.pickHighlighter/*, pointCloudHighlighter: pointCloud.pickHighlighter*/ } } );

    console.timeEnd(str);

    return { container, scene, stickMaterial, background, renderer, cameraLightingRig, picker };

}

export { sceneManagerConfigurator }

export default SceneManager;
