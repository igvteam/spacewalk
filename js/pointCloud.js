import * as THREE from "../node_modules/three/build/three.module.js";
import { degrees } from './math.js';
import { setGeometryAttributeColorListWithColorThreeJS } from './color.js';
import { globals } from "./app.js";
import EnsembleManager from "./ensembleManager.js";

const pointSize = 128;
class PointCloud {

    constructor () {

        const materialConfig =
            {
                size: pointSize,
                vertexColors: THREE.VertexColors,
                map: new THREE.TextureLoader().load( "texture/dot_dugla.png" ),
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
                vertexColors: THREE.VertexColors,
                map: new THREE.TextureLoader().load( "texture/dot_dugla.png" ),
                sizeAttenuation: true,
                alphaTest: 0.5,
                transparent: true,
                depthTest: true
            };

        this.deemphasizedMaterial = new THREE.PointsMaterial( deemphasizedConfig );
        this.deemphasizedMaterial.side = THREE.DoubleSide;

        globals.eventBus.subscribe("DidLeaveGUI", this);
        globals.eventBus.subscribe("DidSelectSegmentID", this);
        globals.eventBus.subscribe("ColorRampMaterialProviderCanvasDidMouseMove", this);

    }

    receiveEvent({ type, data }) {

        const typeConditional = "DidSelectSegmentID" === type || "ColorRampMaterialProviderCanvasDidMouseMove" === type;

        if (typeConditional && globals.sceneManager.renderStyle === PointCloud.getRenderStyle()) {

            if (this.meshList) {

                const { interpolantList } = data;

                const interpolantWindowList = EnsembleManager.getInterpolantWindowList({ trace: globals.ensembleManager.currentTrace, interpolantList });

                if (interpolantWindowList) {

                    for (let mesh of this.meshList) {
                        mesh.material = this.deemphasizedMaterial;
                        setGeometryAttributeColorListWithColorThreeJS(mesh.geometry.attributes.color.array, mesh.geometry.userData.deemphasizedColor)
                    }

                    for (let { index } of interpolantWindowList) {
                        let mesh = this.meshList[ index ];
                        mesh.material = this.material;
                        setGeometryAttributeColorListWithColorThreeJS(mesh.geometry.attributes.color.array, mesh.geometry.userData.color)
                    }

                } // if (interpolantWindowList)

            } // if (this.meshList)

        } else if ("DidLeaveGUI" === type) {
            this.unHighlight();
        }

    }

    static getRenderStyle() {
        return 'render-style-point-cloud';
    }

    configure(trace) {

        this.dispose();

        this.meshList = this.createPointCloud(trace);

        if (globals.sceneManager.renderStyle === PointCloud.getRenderStyle()) {
            this.show();
        } else {
            this.hide();
        }

    }

    createPointCloud(trace) {

        return trace
            .map(({ geometry }) => {
                let mesh = new THREE.Points( geometry, this.material );
                mesh.name = 'point_cloud';
                return mesh;
            });

    };

    updateMaterialProvider (materialProvider) {
        // do stuff
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
        for (let mesh of this.meshList) {
            mesh.visible = false;
        }
    }

    show () {
        for (let mesh of this.meshList) {
            mesh.visible = true;
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

    getThumbnailGeometryList () {
        return undefined;
    }

    getBounds() {
        return globals.pointCloudManager.getBounds();
    }

    DEPRICATED_getCameraPoseAlongAxis ({ axis, scaleFactor }) {

        const { center, radius } = this.getBounds();

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

    unHighlight() {

        if (this.meshList) {

            for (let mesh of this.meshList) {
                mesh.material = this.material;
                setGeometryAttributeColorListWithColorThreeJS(mesh.geometry.attributes.color.array, mesh.geometry.userData.color)
            }

        }

    }

}

export default PointCloud;
