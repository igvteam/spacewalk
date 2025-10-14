import * as THREE from "three"
import {StringUtils} from "igv-utils"
import SpacewalkEventBus from './spacewalkEventBus.js'
import {ensembleManager, igvPanel, pointCloud, scene, sceneManager, getMaterialProvider} from "./appGlobals.js";
import EnsembleManager from "./ensembleManager.js"
import {clamp} from "./utils/mathUtils.js"
import ConvexHull from "./utils/convexHull.js"
import { disposeMaterial, removeAndDisposeArrayFromScene } from './utils/disposalUtils.js'

class PointCloud {

    static renderStyle = 'render-style-point-cloud'

    constructor ({ pickHighlighter, deemphasizedColor }) {
        this.pickHighlighter = pickHighlighter;
        this.deemphasizedColor = deemphasizedColor;

        this.pointSizeBoundRadiusPercentage = undefined
        this.pointSize = undefined

        this.pointOpacity = 0.375
        this.deemphasizedPointOpacity = 0.125/4

        this.createMaterials();

        SpacewalkEventBus.globalBus.subscribe("DidUpdateGenomicInterpolant", this);
        SpacewalkEventBus.globalBus.subscribe("DidLeaveGenomicNavigator", this);
    }

    createMaterials() {
        const materialConfig =
            {
                size: 4,
                vertexColors: true,
                map: new THREE.TextureLoader().load( "texture/dot.png" ),
                sizeAttenuation: true,

                depthTest: true,
                depthWrite: true,

                transparent: true,

                opacity: this.pointOpacity,
                // NOTE: alphaTest value must ALWAYS be less than opacity value
                // If not, nothing will appear onscreen
                alphaTest: this.pointOpacity/2,

            };

        this.material = new THREE.PointsMaterial( materialConfig );
        this.material.side = THREE.DoubleSide;

        const deemphasizedConfig =
            {
                size: 4,
                vertexColors: true,
                map: new THREE.TextureLoader().load( "texture/dot.png" ),
                sizeAttenuation: true,

                // Do NOT participate in depth testing or depth writing
                depthTest: false,
                depthWrite: false,

                transparent: true,

                opacity: this.deemphasizedPointOpacity,
                // NOTE: alphaTest value must ALWAYS be less than opacity value
                // If not, nothing will appear onscreen
                alphaTest: this.deemphasizedPointOpacity/2,

            };

        this.deemphasizedMaterial = new THREE.PointsMaterial( deemphasizedConfig );
        this.deemphasizedMaterial.side = THREE.DoubleSide;
    }

    configure(trace) {

        // Ensure materials exist (recreate if disposed)
        if (!this.material || !this.deemphasizedMaterial) {
            this.createMaterials();
        }

        // Scale point size to pointcloud bbox for reasonable starting point size
        const { radius } = EnsembleManager.getTraceBounds(trace)

        this.pointSize = undefined === this.pointSizeBoundRadiusPercentage ? Math.max(4, Math.floor(radius/16)) : this.pointSizeBoundRadiusPercentage * radius
        document.querySelector('#spacewalk_ui_manager_pointcloud_point_size_label').innerHTML = `Point Size (${ Math.floor(this.pointSize)} nm)`

        this.material.size = this.pointSize
        this.deemphasizedMaterial.size = this.pointSize

        const list = trace.map(({ xyz }) => xyz.length / 3)
        const sum = list.reduce((total, item) => total + item)

        const str = `PointCloud. trace(${ trace.length }) points(${ StringUtils.numberFormatter(sum)})`
        console.time(str)

        this.deemphasisColorAttribute = undefined

        this.meshList = trace
            .map(({ xyz, interpolant, drawUsage }) => {

                const geometry = new THREE.BufferGeometry()

                // xyz
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3 ))

                // rgb
                geometry.userData.colorAttribute = new THREE.Float32BufferAttribute(new Float32Array(xyz.length * 3), 3)
                geometry.userData.colorAttribute.setUsage(drawUsage)

                const rgb = getMaterialProvider().colorForInterpolant(interpolant)
                setGeometryColorAttribute(geometry.userData.colorAttribute.array, rgb)
                geometry.setAttribute('color', geometry.userData.colorAttribute)

                // retain a copy of deemphasis color for use during highlight/unhighlight
                geometry.userData.deemphasisColorAttribute = new THREE.Float32BufferAttribute(new Float32Array(xyz.length * 3), 3)
                setGeometryColorAttribute(geometry.userData.deemphasisColorAttribute.array, pointCloud.deemphasizedColor)

                const mesh = new THREE.Points(geometry, this.material)
                mesh.name = 'point_cloud'
                return mesh
            })

        const positionArray = getPositionArray(this.meshList)
        this.hull = new ConvexHull(positionArray)
        this.hull.mesh.name = 'point_cloud_convex_hull'

        sceneManager.renderStyle === PointCloud.renderStyle ? this.show() : this.hide()

        console.timeEnd(str)

    }

    receiveEvent({ type, data }) {

        if ("DidUpdateGenomicInterpolant" === type && this.meshList && PointCloud.renderStyle === sceneManager.renderStyle) {

            const { interpolantList } = data;

            if (interpolantList) {
                const interpolantWindowList = ensembleManager.getGenomicInterpolantWindowList(interpolantList)

                if (interpolantWindowList) {
                    const objectList = interpolantWindowList.map(({ index }) => this.meshList[ index ])
                    this.pickHighlighter.highlightWithObjectList(objectList)
                }

            } else {
                this.pickHighlighter.unhighlight()
            }


        } else if ("DidLeaveGenomicNavigator" === type) {
            this.pickHighlighter.unhighlight()
        }

    }

    updateMaterialProvider (materialProvider) {

        if (this.meshList) {
            for (const mesh of this.meshList) {

                mesh.material = this.material

                const index = this.meshList.indexOf(mesh)
                const { interpolant } = ensembleManager.currentTrace[ index ]
                const rgb = materialProvider.colorForInterpolant(interpolant)

                setGeometryColorAttribute(mesh.geometry.userData.colorAttribute.array, rgb)
                mesh.geometry.setAttribute('color', mesh.geometry.userData.colorAttribute)
                mesh.geometry.attributes.color.needsUpdate = true
            }
        }
    }

    addToScene (scene) {

        if (this.meshList) {
            for (let mesh of this.meshList) {
                scene.add( mesh );
            }
        }

        // scene.add(this.hull.mesh)
    }

    dispose () {

        if (this.meshList) {
            removeAndDisposeArrayFromScene(scene, this.meshList)
            this.meshList = undefined
        }

        if (this.hull && this.hull.mesh) {
            scene.remove(this.hull.mesh)
            this.hull.mesh.geometry.dispose()
            disposeMaterial(this.hull.mesh.material)
            this.hull.mesh = undefined
            this.hull = undefined
        }

        // Dispose materials
        disposeMaterial(this.material)
        disposeMaterial(this.deemphasizedMaterial)

        this.material = undefined
        this.deemphasizedMaterial = undefined
    }

    renderLoopHelper () {

        if (this.meshList) {
            for (let mesh of this.meshList) {
                mesh.geometry.attributes.color.needsUpdate = true;
            }
        }

    }

    hide () {
        if (this.meshList) {
            for (let mesh of this.meshList) {
                mesh.visible = false;
                this.hull.mesh.visible = false;
            }
        }
    }

    show () {
        if (this.meshList) {
            for (let mesh of this.meshList) {
                mesh.visible = true;
            }
            this.hull.mesh.visible = true;
        }
    }

    updatePointSize(increment) {

        this.pointSize = Math.max(4, this.pointSize + (increment < 0 ? -32 : 32))
        document.querySelector('#spacewalk_ui_manager_pointcloud_point_size_label').innerHTML = `Point Size (${ Math.floor(this.pointSize)} nm)`

        this.material.size = this.pointSize
        this.material.needsUpdate = true

        this.deemphasizedMaterial.size = this.pointSize
        this.deemphasizedMaterial.needsUpdate = true

        const { radius } = EnsembleManager.getTraceBounds(ensembleManager.currentTrace)
        this.pointSizeBoundRadiusPercentage = this.pointSize / radius
    }

    updatePointTransparency(increment) {

        this.pointOpacity += (increment < 0 ? -1 : 1) * (10 / 100) * this.pointOpacity
        this.pointOpacity = clamp(1/10, 9/10, this.pointOpacity)

        this.material.opacity = this.pointOpacity
        this.material.alphaTest = this.pointOpacity/2
        this.material.needsUpdate = true
    }

}

function getPositionArray(meshes){

    const positionArrays = meshes.map(mesh => mesh.geometry.attributes.position.array);

    const length = positionArrays.reduce((sum, array) => sum + array.length, 0);
    const aggregatePositionArray = new Float32Array(length);

    let offset = 0;
    for (const array of positionArrays) {
        aggregatePositionArray.set(array, offset)
        offset += array.length;
    }

    return aggregatePositionArray
}

function setGeometryColorAttribute(geometryColorAttributeArray, threeJSColor) {
    for (let c = 0; c < geometryColorAttributeArray.length; c++) {
        threeJSColor.toArray(geometryColorAttributeArray, c * 3);
    }
}

export { setGeometryColorAttribute }
export default PointCloud;
