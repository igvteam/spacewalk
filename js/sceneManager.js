import * as THREE from 'three'
import {EventBus} from 'igv-widgets'
import EnsembleManager from "./ensembleManager.js"
import SpacewalkEventBus from './spacewalkEventBus.js'
import CameraLightingRig from './cameraLightingRig.js'
import Picker from "./picker.js"
import BallAndStick from "./ballAndStick.js"
import PointCloud from "./pointCloud.js"
import GroundPlane, { groundPlaneConfigurator } from './groundPlane.js'
import Gnomon, { gnomonConfigurator } from './gnomon.js'
import {getMouseXY, setMaterialProvider} from "./utils.js"
import { appleCrayonColorThreeJS } from "./color.js"
import { sceneBackgroundTexture, sceneBackgroundDiagnosticTexture } from "./materialLibrary.js"
import Ribbon from './ribbon.js'
import {degrees} from "./math.js"
import {configureColorPicker, updateColorPicker} from "./guiManager.js"
import {
    pointCloud,
    ribbon,
    ballAndStick,
    ensembleManager,
    guiManager,
    juiceboxPanel,
    igvPanel,
    colorRampMaterialProvider
} from "./app.js"


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

        this.colorPicker = configureColorPicker(document.querySelector(`div[data-colorpicker='background']`), this.scene.background, color => {
            this.scene.background = color
        })

        const { r, g, b } = this.scene.background
        updateColorPicker(this.colorPicker, document.querySelector(`div[data-colorpicker='background']`), { r, g, b })

        this.cameraLightingRig = cameraLightingRig;
        this.cameraLightingRig.addToScene(this.scene);

        SpacewalkEventBus.globalBus.subscribe('RenderStyleDidChange', this);
        SpacewalkEventBus.globalBus.subscribe('DidSelectTrace', this);

    }

    getRenderContainerSize() {
        const { width, height } = this.container.getBoundingClientRect();
        return { width, height };
    }

    async ingestEnsemblePath(url, traceKey) {

        await ensembleManager.loadURL(url, traceKey)

        this.setupWithTrace(ensembleManager.currentTrace)

        this.renderStyle = true === ensembleManager.isPointCloud ? PointCloud.getRenderStyle() : guiManager.getRenderStyle()

        if (this.renderStyle === Ribbon.getRenderStyle()) {
            pointCloud.hide()
            ballAndStick.hide()
            ribbon.show()
        } else if (this.renderStyle === BallAndStick.getRenderStyle()) {
            pointCloud.hide()
            ribbon.hide()
            ballAndStick.show()
        } else if (this.renderStyle === PointCloud.getRenderStyle()) {
            ballAndStick.hide()
            ribbon.hide()
            pointCloud.show()
        }

        setMaterialProvider(colorRampMaterialProvider)

        if (ensembleManager.genomeAssembly !== igvPanel.browser.genome.id) {

            console.log(`Genome swap from ${ igvPanel.browser.genome.id } to ${ ensembleManager.genomeAssembly }. Call igv_browser.loadGenome`)

            const str = `igvPanel.browser.loadGenome(${ ensembleManager.genomeAssembly })`
            console.time(str)

            await igvPanel.browser.loadGenome(ensembleManager.genomeAssembly)

            console.timeEnd(str)
        }

        await igvPanel.locusDidChange(ensembleManager.locus)

        await juiceboxPanel.locusDidChange(ensembleManager.locus)

        EventBus.globalBus.post({ type: 'DidChangeGenome', data: { genomeID: igvPanel.browser.genome.id }})

    }

    async ingestEnsembleGroup(ensembleGroupKey) {

        await ensembleManager.loadEnsembleGroup(ensembleGroupKey)

        this.setupWithTrace(ensembleManager.currentTrace)

        this.renderStyle = true === ensembleManager.isPointCloud ? PointCloud.getRenderStyle() : guiManager.getRenderStyle()

        if (this.renderStyle === Ribbon.getRenderStyle()) {
            pointCloud.hide()
            ballAndStick.hide()
            ribbon.show()
        } else if (this.renderStyle === BallAndStick.getRenderStyle()) {
            pointCloud.hide()
            ribbon.hide()
            ballAndStick.show()
        } else if (this.renderStyle === PointCloud.getRenderStyle()) {
            ballAndStick.hide()
            ribbon.hide()
            pointCloud.show()
        }

        setMaterialProvider(colorRampMaterialProvider)

        await igvPanel.locusDidChange(ensembleManager.locus)

        await juiceboxPanel.locusDidChange(ensembleManager.locus)

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

        }  else if ('DidSelectTrace' === type) {
            const { trace } = data
            this.setupWithTrace(trace)
        }

    }

    setupWithTrace(trace) {

        this.dispose()

        let scene = new THREE.Scene();

        if (ensembleManager.isPointCloud) {

            pointCloud.configure(trace);
            pointCloud.addToScene(scene);

        } else {
            ribbon.configure(trace);
            ribbon.addToScene(scene);
            ballAndStick.configure(trace);
            ballAndStick.addToScene(scene);
        }


        const {min, max, center, radius} = EnsembleManager.getTraceBounds(trace);
        const {position, fov} = getCameraPoseAlongAxis({ center, radius, axis: '+z', scaleFactor: 1e1 });
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

        // Gnomon
        if (this.gnomon) {
            this.gnomon.dispose();
        }

        this.gnomon = new Gnomon(gnomonConfigurator(min, max, boundingDiameter));
        this.gnomon.addToScene(this.scene);

        $(this.container).on('mousemove.spacewalk.picker', (event) => {

            const { x, y } = getMouseXY(this.renderer.domElement, event);
            mouseX =  ( x / this.renderer.domElement.clientWidth  ) * 2 - 1;
            mouseY = -( y / this.renderer.domElement.clientHeight ) * 2 + 1;

        });

    }

    resizeContainer() {
        const { width, height } =  this.container.getBoundingClientRect()
        this.renderer.setSize(width, height)

        this.cameraLightingRig.object.aspect = width / height
        this.cameraLightingRig.object.updateProjectionMatrix()

    }

    dispose() {

        $(this.container).off('mousemove.spacewalk.picker')
        mouseX = mouseY = undefined

        if (this.scene) {

            const disposable = this.scene.children.filter(child => disposableSet.has(child.name))

            for (const d of disposable) {
                this.scene.remove(d)
            }

            delete this.scene
        }

        ballAndStick.dispose()
        ribbon.dispose()
        pointCloud.dispose()
    }

    renderLoopHelper() {

        pointCloud.renderLoopHelper()

        ballAndStick.renderLoopHelper()

        ribbon.renderLoopHelper()

        colorRampMaterialProvider.renderLoopHelper()

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

        if (this.cameraLightingRig.resetCamera) {
            this.cameraLightingRig.resetCamera()
        }

    }

}

function getCameraPoseAlongAxis ({ center, radius, axis, scaleFactor }) {

    const dimen = scaleFactor * radius;

    const theta = Math.atan(radius/dimen);
    const fov = degrees( 2 * theta);

    const axes =
        {
            '-x': () => {
                return new THREE.Vector3(-dimen, 0, 0);
            },
            '+x': () => {
                return new THREE.Vector3(dimen, 0, 0);
            },
            '-y': () => {
                return new THREE.Vector3(0, -dimen, 0);
            },
            '+y': () => {
                return new THREE.Vector3(0, dimen, 0);
            },
            '-z': () => {
                return new THREE.Vector3(0, 0, -dimen);
            },
            '+z': () => {
                return new THREE.Vector3(0, 0, dimen);
            },
        };

    const vector = axes[ axis ]();
    let position = new THREE.Vector3();

    position.addVectors(center, vector);

    return { target:center, position, fov }
}

const sceneManagerConfigurator = (container) => {

    const str = `Scene Manager Configuration Builder Complete`;
    console.time(str);

    // Opt out of linear color workflow for now
    // https://discourse.threejs.org/t/updates-to-color-management-in-three-js-r152/50791
    // THREE.ColorManagement.enabled = false;

    // Enable linear color workflow
    THREE.ColorManagement.enabled = true;

    // const stickMaterial = showSMaterial;
    // const stickMaterial = new THREE.MeshBasicMaterial({ color: appleCrayonColorThreeJS('aluminum') });
    const stickMaterial = new THREE.MeshPhongMaterial({ color: appleCrayonColorThreeJS('aluminum') });
    stickMaterial.side = THREE.DoubleSide;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    // Opt out of linear color workflow for now
    // https://discourse.threejs.org/t/updates-to-color-management-in-three-js-r152/50791
    // renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

    // Enable linear color workflow
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // renderer.setClearColor (appleCrayonColorThreeJS('nickel'));
    // renderer.setClearColor (appleCrayonColorThreeJS('strawberry'));

    // Update due to r155 changes to illumination: Multiply light intensities by PI to get same brightness as previous threejs release.
    // See: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733
    const hemisphereLight = new THREE.HemisphereLight( appleCrayonColorThreeJS('snow'), appleCrayonColorThreeJS('tin'), Math.PI );

    const { width, height } = container.getBoundingClientRect();
    const [ fov, near, far, domElement, aspect ] = [ 35, 1e2, 3e3, renderer.domElement, (width/height) ];
    const cameraLightingRig = new CameraLightingRig({ fov, near, far, domElement, aspect, hemisphereLight });

    // Nice numbers
    const position = new THREE.Vector3(134820, 55968, 5715);
    const centroid = new THREE.Vector3(133394, 54542, 4288);
    cameraLightingRig.setPose(position, centroid);

    const background = appleCrayonColorThreeJS('snow');
    // const background = appleCrayonColorThreeJS('nickel');
    // const background = sceneBackgroundTexture;

    const scene = new THREE.Scene();
    scene.background = background;

    const picker = new Picker( new THREE.Raycaster() );

    console.timeEnd(str);

    return { container, scene, stickMaterial, background, renderer, cameraLightingRig, picker };

}

export { sceneManagerConfigurator }

export default SceneManager;
