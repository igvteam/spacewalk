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
import {
    pointCloud,
    ribbon,
    ballAndStick,
    ensembleManager,
    guiManager,
    igvPanel,
    colorRampMaterialProvider,
    cameraLightingRig,
    getRenderContainerSize
} from "./app.js"

const disposableSet = new Set([ 'gnomon', 'groundplane', 'ribbon', 'ball' , 'stick' ]);

class SceneManager {

    constructor({ scene, background }) {

        this.background = background;

        // stub configuration
        this.scene = scene;

        this.colorPicker = configureColorPicker(document.querySelector(`div[data-colorpicker='background']`), this.scene.background, color => {
            this.background = color
            this.scene.background = this.background

        })

        const { r, g, b } = this.background
        updateColorPicker(this.colorPicker, document.querySelector(`div[data-colorpicker='background']`), { r, g, b })

        SpacewalkEventBus.globalBus.subscribe('RenderStyleDidChange', this);
        SpacewalkEventBus.globalBus.subscribe('DidSelectTrace', this);

    }


    async ingestEnsemblePath(url, traceKey, ensembleGroupKey) {

        await ensembleManager.loadURL(url, traceKey, ensembleGroupKey)

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

        unsetDataMaterialProviderCheckbox(igvPanel.browser.trackViews)

        setMaterialProvider(colorRampMaterialProvider)

        await igvPanel.locusDidChange(ensembleManager.locus)

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

        const { width, height } = getRenderContainerSize();
        cameraLightingRig.configure({fov, aspect: width/height, position: cameraPosition, centroid, boundingDiameter});

        cameraLightingRig.addToScene(this.scene);

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

    }

    dispose() {

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

    toJSON() {
        const { r, g, b } = this.scene.background
        return  { r, g, b }
    }

    setBackground({ r, g, b }) {
        this.background = new THREE.Color(r, g, b)
        this.scene.background = this.background
     }

}

export default SceneManager;
