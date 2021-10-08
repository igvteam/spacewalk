import { EventBus } from 'igv-widgets'
import * as THREE from "three";
import { ensembleManager, sceneManager } from "./app.js";
import EnsembleManager from "./ensembleManager.js";

const pointSize = 128;

class PointCloud {

    constructor ({ pickHighlighter, deemphasizedColor }) {

        this.pickHighlighter = pickHighlighter;
        this.deemphasizedColor = deemphasizedColor;

        const materialConfig =
            {
                size: pointSize,
                vertexColors: THREE.VertexColors,
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
                vertexColors: THREE.VertexColors,
                map: new THREE.TextureLoader().load( "texture/dot.png" ),
                sizeAttenuation: true,
                alphaTest: 0.5,
                transparent: true,
                depthTest: true
            };

        this.deemphasizedMaterial = new THREE.PointsMaterial( deemphasizedConfig );
        this.deemphasizedMaterial.side = THREE.DoubleSide;

        EventBus.globalBus.subscribe("DidUpdateGenomicInterpolant", this);
        EventBus.globalBus.subscribe("DidUpdateColorRampInterpolant", this);

    }

    receiveEvent({ type, data }) {

        const typeConditional = "DidUpdateGenomicInterpolant" === type || "DidUpdateColorRampInterpolant" === type;
        const renderStyleConditional = PointCloud.getRenderStyle() === sceneManager.renderStyle

        if (this.meshList && typeConditional && renderStyleConditional) {

            const { interpolantList } = data;

            const interpolantWindowList = EnsembleManager.getInterpolantWindowList({ trace: ensembleManager.currentTrace, interpolantList });

            if (interpolantWindowList) {
                const objectList = interpolantWindowList.map(({ index }) => this.meshList[ index ]);
                this.pickHighlighter.configureObjectList(objectList);

            }

        }

    }

    configure(trace) {

        this.dispose();

        this.trace = trace

        this.meshList = this.createPointCloud(trace);

        if (sceneManager.renderStyle === PointCloud.getRenderStyle()) {
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

    static getRenderStyle() {
        return 'render-style-point-cloud';
    }
}

const setGeometryColorAttribute = (colorList, colorThreeJS) => {

    for (let c = 0; c < colorList.length; c++) {
        colorThreeJS.toArray(colorList, c * 3);
    }

};

export { setGeometryColorAttribute }
export default PointCloud;