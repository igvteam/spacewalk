import * as THREE from 'three'
import EnsembleManager from "./ensembleManager.js"
import SpacewalkEventBus from './spacewalkEventBus.js'
import {getCameraPoseAlongAxis} from './cameraLightingRig.js'
import BallAndStick from "./ballAndStick.js"
import PointCloud from "./pointCloud.js"
import GroundPlane from './groundPlane.js'
import Gnomon from './gnomon.js'
import GUIManager from "./guiManager.js"
import {setMaterialProvider, unsetDataMaterialProviderCheckbox} from "./utils/utils.js"
import Ribbon from './ribbon.js'
import { clearScene } from './utils/disposalUtils.js'
import {
    scene,
    pointCloud,
    ribbon,
    ballAndStick,
    ensembleManager,
    igvPanel,
    cameraLightingRig,
    getThreeJSContainerRect,
} from "./main.js"
import {appleCrayonColorThreeJS} from "./utils/colorUtils"

const disposableSet = new Set([ 'gnomon', 'groundplane', 'ribbon', 'ball' , 'stick' ]);

class SceneManager {

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
        this.configureRenderStyle(true === ensembleManager.isPointCloud ? PointCloud.renderStyle : GUIManager.getRenderStyleWidgetState())

        unsetDataMaterialProviderCheckbox(igvPanel.browser.trackViews)
        setMaterialProvider(this.colorRampMaterialProvider)

        if (ensembleManager.genomeAssembly !== igvPanel.browser.genome.id) {
            console.log(`Genome swap from ${ igvPanel.browser.genome.id } to ${ ensembleManager.genomeAssembly }. Call igv_browser.loadGenome`)
            await igvPanel.browser.loadGenome(ensembleManager.genomeAssembly)
        }

        await igvPanel.locusDidChange(ensembleManager.locus)

    }

    async ingestEnsembleGroup(ensembleGroupKey) {

        await ensembleManager.loadEnsembleGroup(ensembleGroupKey)

        this.setupWithTrace(ensembleManager.currentTrace)
        this.configureRenderStyle(true === ensembleManager.isPointCloud ? PointCloud.renderStyle : GUIManager.getRenderStyleWidgetState())

        unsetDataMaterialProviderCheckbox(igvPanel.browser.trackViews)
        setMaterialProvider(this.colorRampMaterialProvider)

        await igvPanel.locusDidChange(ensembleManager.locus)

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

        // GroundPlane
        const groundPlaneConfig =
            {
            size: boundingDiameter,
            divisions: 16,
            position: new THREE.Vector3(center.x, min.y, center.z),
            color: appleCrayonColorThreeJS( 'iron'),
            opacity: 0.25,
            isHidden: GroundPlane.setGroundPlaneHidden()
            };

        const groundPlane = new GroundPlane(groundPlaneConfig)
        scene.add(groundPlane)

        // Gnomon
        const gnomonConfig =
            {
                min,
                max,
                boundingDiameter,
                color: appleCrayonColorThreeJS('iron'),
                isHidden: Gnomon.setGnomonHidden()
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


export default SceneManager;
