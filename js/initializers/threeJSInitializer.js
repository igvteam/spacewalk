import * as THREE from "three"
import CameraLightingRig from "../cameraLightingRig.js"
import Picker from "../picker.js"
import PointCloud from "../pointCloud.js"
import Ribbon from "../ribbon.js"
import BallAndStick from "../ballAndStick.js"
import SceneManager from "../sceneManager.js"
import BallHighlighter from "../ballHighlighter.js"
import PointCloudHighlighter from "../pointCloudHighlighter.js"
import { appleCrayonColorThreeJS, highlightColor, createColorPicker, updateColorPicker } from "../utils/colorUtils.js"
import { getMouseXY } from '../utils/utils.js'

/**
 * Initializer class responsible for setting up the Three.js scene, camera, renderer,
 * and all 3D visualization objects.
 */
class ThreeJSInitializer {
    constructor(container, colorPickerContainer) {
        this.container = container;
        this.colorPickerContainer = colorPickerContainer
        this.mouseX = null;
        this.mouseY = null;
    }

    /**
     * Initialize all Three.js objects and return them
     * @param {Object} colorRampMaterialProvider - The color ramp material provider
     * @returns {Object} Object containing all initialized Three.js objects
     */
    initialize(colorRampMaterialProvider) {
        const threeJSObjects = {};

        // Create visualization objects
        threeJSObjects.ribbon = new Ribbon();

        const stickMaterial = new THREE.MeshPhongMaterial({ color: appleCrayonColorThreeJS('aluminum') });
        stickMaterial.side = THREE.DoubleSide;

        threeJSObjects.ballAndStick = new BallAndStick({
            pickHighlighter: new BallHighlighter(highlightColor),
            stickMaterial
        });

        threeJSObjects.pointCloud = new PointCloud({
            pickHighlighter: new PointCloudHighlighter(),
            deemphasizedColor: appleCrayonColorThreeJS('magnesium')
        });

        threeJSObjects.sceneManager = new SceneManager(colorRampMaterialProvider);

        threeJSObjects.picker = new Picker(new THREE.Raycaster());

        // Configure Three.js color management
        THREE.ColorManagement.enabled = true;

        // Create and configure renderer
        threeJSObjects.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        threeJSObjects.renderer.outputColorSpace = THREE.SRGBColorSpace;
        threeJSObjects.renderer.setPixelRatio(window.devicePixelRatio);

        const { width, height } = this.container.getBoundingClientRect();
        threeJSObjects.renderer.setSize(width, height);

        this.container.appendChild(threeJSObjects.renderer.domElement);

        // Set up mouse tracking
        this.container.addEventListener('mousemove', event => {
            const { x, y } = getMouseXY(threeJSObjects.renderer.domElement, event);
            this.mouseX = (x / threeJSObjects.renderer.domElement.clientWidth) * 2 - 1;
            this.mouseY = -(y / threeJSObjects.renderer.domElement.clientHeight) * 2 + 1;
        });

        // Create scene
        threeJSObjects.scene = new THREE.Scene();
        threeJSObjects.scene.background = appleCrayonColorThreeJS('snow');

        // Create camera
        const fov = 35;
        const near = 1e2;
        const far = 3e3;
        const aspect = width / height;
        threeJSObjects.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

        // Create camera lighting rig
        threeJSObjects.cameraLightingRig = new CameraLightingRig(
            threeJSObjects.renderer.domElement,
            threeJSObjects.camera
        );

        // Set initial camera position
        const position = new THREE.Vector3(134820, 55968, 5715);
        const centroid = new THREE.Vector3(133394, 54542, 4288);
        threeJSObjects.cameraLightingRig.setPose(position, centroid);

        // Set up background color picker (only if container provided)
        if (this.colorPickerContainer) {
            const colorHandler = color => {
                threeJSObjects.scene.background = new THREE.Color(color);
                threeJSObjects.renderer.render(threeJSObjects.scene, threeJSObjects.camera);
            }

            threeJSObjects.sceneBackgroundColorPicker = createColorPicker(this.colorPickerContainer, threeJSObjects.scene.background, colorHandler);

            this.updateSceneBackgroundColorpicker(
                this.container,
                threeJSObjects.scene.background,
                threeJSObjects.sceneBackgroundColorPicker
            );
        } else {
            threeJSObjects.sceneBackgroundColorPicker = null;
        }

        return threeJSObjects;
    }

    updateSceneBackgroundColorpicker(container, backgroundColor, colorPicker) {
        const { r, g, b } = backgroundColor;
        updateColorPicker(colorPicker, container, { r, g, b });
    }

    getMouseCoordinates() {
        return { x: this.mouseX, y: this.mouseY };
    }
}

export default ThreeJSInitializer;

