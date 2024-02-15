import * as THREE from "three";
import SpacewalkEventBus from './spacewalkEventBus.js'
import {ensembleManager, igvPanel, pointCloud, sceneManager} from "./app.js";
import {StringUtils} from "igv-utils";

const pointSize = 128;

class PointCloud {

    constructor ({ pickHighlighter, deemphasizedColor }) {

        this.pickHighlighter = pickHighlighter;
        this.deemphasizedColor = deemphasizedColor;

        const materialConfig =
            {
                size: pointSize,
                vertexColors: true,
                map: new THREE.TextureLoader().load( "texture/dot.png" ),
                sizeAttenuation: true,
                alphaTest: 0.5,
                transparent: true,
                depthTest: true
            };

        this.material = new THREE.PointsMaterial( materialConfig );
        this.material.side = THREE.DoubleSide;

        const deemphasizedConfig =
            {
                size: pointSize,
                vertexColors: true,
                // map: new THREE.TextureLoader().load( "texture/blank.png" ),
                map: new THREE.TextureLoader().load( "texture/dot.png" ),
                sizeAttenuation: true,
                alphaTest: 0.5,

                // NOTE: Turning off transparency makes the deemphasized points a backdrop for
                //       the highlighted points
                // transparent: true,
                transparent: false,

                // Do not participate in depth testing
                // depthTest: true
                depthTest: false
            };

        this.deemphasizedMaterial = new THREE.PointsMaterial( deemphasizedConfig );
        this.deemphasizedMaterial.side = THREE.DoubleSide;

        SpacewalkEventBus.globalBus.subscribe("DidUpdateGenomicInterpolant", this);
        SpacewalkEventBus.globalBus.subscribe("DidLeaveGenomicNavigator", this);
    }

    receiveEvent({ type, data }) {

        if (this.meshList && "DidUpdateGenomicInterpolant" === type && PointCloud.getRenderStyle() === sceneManager.renderStyle) {

            const { interpolantList } = data;

            const interpolantWindowList = ensembleManager.getGenomicInterpolantWindowList(interpolantList)

            if (interpolantWindowList) {
                const objectList = interpolantWindowList.map(({ index }) => {
                    const mesh = this.meshList[ index ]
                    return mesh
                })
                this.pickHighlighter.highlightWithObjectList(objectList)
            }

        } else if ("DidLeaveGenomicNavigator" === type) {
            this.pickHighlighter.unhighlight()
        }

    }

    configure(trace) {

        //  const sum = array.reduce((total, item) => total + item);
        const list = trace.map(({ xyz }) => xyz.length / 3)
        for (const length of list) {
            console.log(`Point cloud cluster(${ list.indexOf(length) }) ${ StringUtils.numberFormatter(length)} points`)
        }

        const sum = list.reduce((total, item) => total + item)

        const str = `Point cloud total ${ StringUtils.numberFormatter(sum)} points`
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

                const rgb = igvPanel.materialProvider.colorForInterpolant(interpolant)
                setGeometryColorAttribute(geometry.userData.colorAttribute.array, rgb)
                geometry.setAttribute('color', geometry.userData.colorAttribute)

                // retain a copy of emphasise color for use during highlight/unhighlight
                geometry.userData.deemphasisColorAttribute = new THREE.Float32BufferAttribute(new Float32Array(xyz.length * 3), 3)
                setGeometryColorAttribute(geometry.userData.deemphasisColorAttribute.array, pointCloud.deemphasizedColor)

                const mesh = new THREE.Points(geometry, this.material)
                mesh.name = 'point_cloud'
                return mesh
            })

        sceneManager.renderStyle === PointCloud.getRenderStyle() ? this.show() : this.hide()

        console.timeEnd(str)

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
        for (let mesh of this.meshList) {
            scene.add( mesh );
        }
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
            }
        }
    }

    show () {
        if (this.meshList) {
            for (let mesh of this.meshList) {
                mesh.visible = true;
            }
        }
    }

    dispose () {

        if (this.meshList) {
            for (let mesh of this.meshList) {
                // mesh.material.dispose();
                mesh.geometry.dispose();
            }
        }

    }


    static getRenderStyle() {
        return 'render-style-point-cloud';
    }
}

function setGeometryColorAttribute(geometryColorAttributeArray, threeJSColor) {
    for (let c = 0; c < geometryColorAttributeArray.length; c++) {
        threeJSColor.toArray(geometryColorAttributeArray, c * 3);
    }
}

export { setGeometryColorAttribute }
export default PointCloud;
