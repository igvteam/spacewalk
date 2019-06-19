import * as THREE from "../node_modules/three/build/three.module.js";
import { degrees } from './math.js';
import Globals from "./globals.js";

class PointCloud {

    constructor () {
    }

    highlight(geometryUUID) {

        if (this.meshList) {
            for (let mesh of this.meshList) {
                mesh.visible = geometryUUID === mesh.geometry.uuid;
            }
        }

    }

    unHighlight() {
        if (this.meshList) {
            for (let mesh of this.meshList) {
                mesh.visible = true;
            }
        }

    }

    static getRenderStyle() {
        return 'render-style-point-cloud';
    }

    configure(geometryList) {

        this.dispose();

        this.meshList = createPointCloud(geometryList);

        if (Globals.sceneManager.renderStyle === PointCloud.getRenderStyle()) {
            this.show();
        } else {
            this.hide();
        }

    }

    updateMaterialProvider (materialProvider) {
        // do stuff
    }

    addToScene (scene) {
        for (let mesh of this.meshList) {
            scene.add( mesh );
        }
    }

    renderLoopHelper () {
        // do stuff
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
                mesh.material.dispose();
                mesh.geometry.dispose();
            }
        }

    }

    getThumbnailGeometryList () {
        return undefined;
    }

    getBounds() {
        return Globals.pointCloudManager.getBounds();
    }

    getCameraPoseAlongAxis ({ axis, scaleFactor }) {

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

}

const createPointCloud = geometryList => {

    // const pointsMaterialConfig =
    //     {
    //         size: 32,
    //         vertexColors: THREE.VertexColors
    //     };

    const map = new THREE.TextureLoader().load( "texture/dot_dugla.png" );
    // const map = new THREE.TextureLoader().load( "texture/dot_dugla_translucent.png" );
    const pointsMaterialConfig =
        {
            size: 64,
            vertexColors: THREE.VertexColors,
            map,
            transparent: true,
            depthTest: false,
            side: THREE.DoubleSide
        };

    let material = new THREE.PointsMaterial( pointsMaterialConfig );
    material.side = THREE.DoubleSide;

    return geometryList
        .map(geometry => {
            let mesh = new THREE.Points( geometry, material );
            mesh.name = 'point_cloud';
            return mesh;
        });

};

export default PointCloud;
