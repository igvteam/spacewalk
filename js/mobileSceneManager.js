import * as THREE from 'three'
import EnsembleManager from "./ensembleManager.js"
import SpacewalkEventBus from './spacewalkEventBus.js'
import {getCameraPoseAlongAxis} from './cameraLightingRig.js'
import BallAndStick from "./ballAndStick.js"
import PointCloud from "./pointCloud.js"
import GroundPlane from './groundPlane.js'
import Gnomon from './gnomon.js'
import {setMaterialProvider} from "./utils/utils.js"
import Ribbon from './ribbon.js'
import { clearScene } from './utils/disposalUtils.js'
import {
    scene,
    pointCloud,
    ribbon,
    ballAndStick,
    ensembleManager,
    cameraLightingRig,
    getThreeJSContainerRect,
} from "./appGlobals.js"
import {appleCrayonColorThreeJS} from "./utils/colorUtils"

/**
 * Mobile Scene Manager - streamlined version without desktop UI dependencies.
 * No IGV panel, no Juicebox panel, no GUIManager.
 */
class MobileSceneManager {

    constructor(colorRampMaterialProvider) {
        this.colorRampMaterialProvider = colorRampMaterialProvider;
        SpacewalkEventBus.globalBus.subscribe('RenderStyleDidChange', this);
        SpacewalkEventBus.globalBus.subscribe('DidSelectTrace', this);
    }

    receiveEvent({ type, data }) {

        if ('RenderStyleDidChange' === type) {

            if (data === Ribbon.renderStyle) {
                this.renderStyle = Ribbon.renderStyle
                ballAndStick.hide()
                ribbon.show()
            } else if (data === BallAndStick.renderStyle) {
                this.renderStyle = BallAndStick.renderStyle
                ribbon.hide()
                ballAndStick.show()
            }

        }  else if ('DidSelectTrace' === type) {
            const { trace } = data
            this.setupWithTrace(trace)
        }

    }

    async ingestEnsemblePath(url, traceKey, ensembleGroupKey) {

        await ensembleManager.loadURL(url, traceKey, ensembleGroupKey)

        this.setupWithTrace(ensembleManager.currentTrace)
        
        // Mobile: default to BallAndStick unless it's a point cloud
        const defaultRenderStyle = ensembleManager.isPointCloud ? PointCloud.renderStyle : BallAndStick.renderStyle;
        this.configureRenderStyle(defaultRenderStyle)

        // Set material provider for mobile
        setMaterialProvider(this.colorRampMaterialProvider)

    }

    async ingestEnsembleGroup(ensembleGroupKey) {

        await ensembleManager.loadEnsembleGroup(ensembleGroupKey)

        this.setupWithTrace(ensembleManager.currentTrace)
        
        // Mobile: default to BallAndStick unless it's a point cloud
        const defaultRenderStyle = ensembleManager.isPointCloud ? PointCloud.renderStyle : BallAndStick.renderStyle;
        this.configureRenderStyle(defaultRenderStyle)

        // Set material provider for mobile
        setMaterialProvider(this.colorRampMaterialProvider)

    }

    setupWithTrace(trace) {

        this.background = scene.background
        this.purgeScene()

        if (ensembleManager.isPointCloud) {
            pointCloud.configure(trace);
            pointCloud.addToScene(scene);
        } else {
            ribbon.configure(trace);
            ribbon.addToScene(scene);
            ballAndStick.configure(trace);
            ballAndStick.addToScene(scene);
        }

        scene.background = this.background;

        const {min, max, center, radius} = EnsembleManager.getTraceBounds(trace);
        const {position, fov} = getCameraPoseAlongAxis({ center, radius, axis: '+z', scaleFactor: 1e1 })

        const boundingDiameter = (2 * radius)

        const { width, height } = getThreeJSContainerRect();
        cameraLightingRig.configure(fov, width/height, position, center, boundingDiameter)

        scene.add(createHemisphereLight())

        // GroundPlane - hidden by default on mobile
        const groundPlaneConfig =
            {
            size: boundingDiameter,
            divisions: 16,
            position: new THREE.Vector3(center.x, min.y, center.z),
            color: appleCrayonColorThreeJS( 'iron'),
            opacity: 0.25,
            isHidden: true  // Hidden by default on mobile
            };

        const groundPlane = new GroundPlane(groundPlaneConfig)
        scene.add(groundPlane)

        // Gnomon - hidden by default on mobile
        const gnomonConfig =
            {
                min,
                max,
                boundingDiameter,
                color: appleCrayonColorThreeJS('iron'),
                isHidden: true  // Hidden by default on mobile
            };
        const gnomon = new Gnomon(gnomonConfig)
        gnomon.addToScene(scene)

    }

    configureRenderStyle (renderStyle) {

        if (Ribbon.renderStyle === renderStyle) {
            pointCloud.hide()
            ballAndStick.hide()
            ribbon.show()
        } else if (BallAndStick.renderStyle === renderStyle) {
            pointCloud.hide()
            ribbon.hide()
            ballAndStick.show()
        } else if (PointCloud.renderStyle === renderStyle) {
            ballAndStick.hide()
            ribbon.hide()
            pointCloud.show()
        }

        this.renderStyle = renderStyle
    }

    getHemisphereLight(){
        return scene.getObjectByName('hemisphereLight')
    }

    getGnomon(){
        return scene.getObjectByName('gnomon')
    }

    getGroundPlane(){
        return scene.getObjectByName('groundplane')
    }

    toJSON() {
        const { r, g, b } = scene.background
        return  { r, g, b }
    }

    isGood2Go() {
        return scene && this.getGnomon() && this.getGroundPlane()
     }

    purgeScene() {

        // First dispose render objects (they may reference scene objects)
        ballAndStick.dispose()
        ribbon.dispose()
        pointCloud.dispose()

        // Then clear all scene objects
        clearScene(scene)

        // Dispose any remaining scene objects that might be referenced by name
        const gnomonInstance = this.getGnomon()
        if (gnomonInstance) {
            gnomonInstance.dispose()
        }

        const groundPlaneInstance = this.getGroundPlane()
        if (groundPlaneInstance) {
            groundPlaneInstance.dispose()
        }

    }

    static getConvexHull(renderStyle) {
        switch (renderStyle) {
            case Ribbon.renderStyle:
                return ribbon.hull
            case PointCloud.renderStyle:
                return pointCloud.hull
            case BallAndStick.renderStyle:
                return ballAndStick.hull
            default:
                console.warn("Unknown render style");
                return undefined
        }
    }

}

function createHemisphereLight() {
    // Update due to r155 changes to illumination: Multiply light intensities by PI to get same brightness as previous threejs release.
    // See: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733
    const light = new THREE.HemisphereLight( appleCrayonColorThreeJS('snow'), appleCrayonColorThreeJS('tin'), Math.PI )
    light.name = 'hemisphereLight'
    return light
}


export default MobileSceneManager;

