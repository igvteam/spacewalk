import * as THREE from 'three'
import EnsembleManager from "./ensembleManager.js"
import SpacewalkEventBus from './spacewalkEventBus.js'
import {getCameraPoseAlongAxis} from './cameraLightingRig.js'
import BallAndStick from "./ballAndStick.js"
import PointCloud from "./pointCloud.js"
import GroundPlane, { groundPlaneConfigurator } from './groundPlane.js'
import Gnomon, { gnomonConfigurator } from './gnomon.js'
import {setMaterialProvider, unsetDataMaterialProviderCheckbox} from "./utils/utils.js"
import Ribbon from './ribbon.js'
import {configureColorPicker, updateColorPicker} from "./guiManager.js"
import { scene, pointCloud, ribbon, ballAndStick, ensembleManager, guiManager, igvPanel, colorRampMaterialProvider, cameraLightingRig, getRenderContainerSize } from "./app.js"

const disposableSet = new Set([ 'gnomon', 'groundplane', 'ribbon', 'ball' , 'stick' ]);

class SceneManager {

    constructor() {

        this.colorPicker = configureColorPicker(document.querySelector(`div[data-colorpicker='background']`), scene.background, color => {
            scene.background = color
        })

        const { r, g, b } = scene.background
        updateColorPicker(this.colorPicker, document.querySelector(`div[data-colorpicker='background']`), { r, g, b })

        SpacewalkEventBus.globalBus.subscribe('RenderStyleDidChange', this);
        SpacewalkEventBus.globalBus.subscribe('DidSelectTrace', this);

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

    async ingestEnsemblePath(url, traceKey, ensembleGroupKey) {

        await ensembleManager.loadURL(url, traceKey, ensembleGroupKey)

        this.setupWithTrace(ensembleManager.currentTrace)
        this.configureRenderStyle(true === ensembleManager.isPointCloud ? PointCloud.getRenderStyle() : guiManager.getRenderStyle())

        unsetDataMaterialProviderCheckbox(igvPanel.browser.trackViews)
        setMaterialProvider(colorRampMaterialProvider)

        if (ensembleManager.genomeAssembly !== igvPanel.browser.genome.id) {
            console.log(`Genome swap from ${ igvPanel.browser.genome.id } to ${ ensembleManager.genomeAssembly }. Call igv_browser.loadGenome`)
            await igvPanel.browser.loadGenome(ensembleManager.genomeAssembly)
        }

        await igvPanel.locusDidChange(ensembleManager.locus)

    }

    async ingestEnsembleGroup(ensembleGroupKey) {

        await ensembleManager.loadEnsembleGroup(ensembleGroupKey)

        this.setupWithTrace(ensembleManager.currentTrace)
        this.configureRenderStyle(true === ensembleManager.isPointCloud ? PointCloud.getRenderStyle() : guiManager.getRenderStyle())

        unsetDataMaterialProviderCheckbox(igvPanel.browser.trackViews)
        setMaterialProvider(colorRampMaterialProvider)

        await igvPanel.locusDidChange(ensembleManager.locus)

    }

    setupWithTrace(trace) {

        this.dispose()

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
        this.configure({ min, max, boundingDiameter: (2 * radius), cameraPosition: position, centroid: center, fov });

    }

    configureRenderStyle (renderStyle) {

        this.renderStyle = renderStyle

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
    }

    configure({ min, max, boundingDiameter, cameraPosition, centroid, fov }) {

        scene.background = this.background;

        const { r, g, b } = this.background
        updateColorPicker(this.colorPicker, document.querySelector(`div[data-colorpicker='background']`), { r, g, b })

        const { width, height } = getRenderContainerSize();
        cameraLightingRig.configure({fov, aspect: width/height, position: cameraPosition, centroid, boundingDiameter});
        cameraLightingRig.addToScene(scene);

        // GroundPlane
        const groundPlane = new GroundPlane(groundPlaneConfigurator(new THREE.Vector3(centroid.x, min.y, centroid.z), boundingDiameter));
        scene.add(groundPlane)

        // Gnomon
        const gnomon = new Gnomon(gnomonConfigurator(min, max, boundingDiameter))
        gnomon.addToScene(scene)

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

    dispose() {

        this.background = scene.background

        if (scene) {
            while (scene.children.length > 0) {
                const child = scene.children[0];

                // Call custom dispose if available
                if (typeof child.dispose === 'function') {
                    child.dispose();
                } else {
                    // Fallback disposal for other objects with geometry or material
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }

                scene.remove(child);
            }
        }

        ballAndStick.dispose()
        ribbon.dispose()
        pointCloud.dispose()
    }

    setBackground({ r, g, b }) {
        scene.background = new THREE.Color(r, g, b)
     }

    isGood2Go() {
        return scene && this.getGnomon() && this.getGroundPlane()
     }
}

export default SceneManager;
