import * as THREE from "../node_modules/three/build/three.module.js";
import { getBoundsWithPointCloud } from './pointCloudManager.js';
import { degrees } from './math.js';
import { appleCrayonColorThreeJS } from "./color.js";

class PointCloud {

    constructor () {
    }

    static getRenderStyle() {
        return 'render-style-point-cloud';
    }

    configure(pointCloudGeometry, pointCloudConvexHullGeometry, renderStyle) {

        this.dispose();

        this.pc = { points: undefined, convexHull: undefined };

        this.pc.points = createPointCloud(pointCloudGeometry);

        this.pc.convexHull = createConvexHull(pointCloudConvexHullGeometry);

        if (renderStyle === PointCloud.getRenderStyle()) {
            this.show();
        } else {
            this.hide();
        }

    }

    updateMaterialProvider (materialProvider) {
        // do stuff
    }

    addToScene (scene) {
        scene.add( this.pc.points.mesh );
        scene.add( this.pc.convexHull.mesh );
    }

    renderLoopHelper () {
        // do stuff
    }

    hide () {
        this.pc.points.mesh.visible = false;
        this.pc.convexHull.mesh.visible = false;
    }

    show () {
        this.pc.points.mesh.visible = true;
        this.pc.convexHull.mesh.visible = true;
    }

    dispose () {

        if (this.pc) {

            this.pc.points.mesh.material.dispose();
            this.pc.points.mesh.geometry.dispose();

            this.pc.convexHull.mesh.material.dispose();
            this.pc.convexHull.mesh.geometry.dispose();

        }

    }

    getThumbnailGeometryList () {
        return undefined;
    }

    getBounds() {
        return getBoundsWithPointCloud(this.pc.convexHull.mesh);
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

const createConvexHull = convexHullGeometry => {

    let material = new THREE.MeshLambertMaterial( { wireframe: true, color: appleCrayonColorThreeJS('nickel') } );

    let mesh = new THREE.Mesh( convexHullGeometry, material );
    mesh.name = 'point_cloud_convex_hull';

    return { mesh };

};

const createPointCloud = pointCloudGeometry => {

    // const pointsMaterialConfig =
    //     {
    //         size: 32,
    //         vertexColors: THREE.VertexColors
    //     };

    const map = new THREE.TextureLoader().load( "texture/dot_dugla.png" );
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

    let mesh = new THREE.Points( pointCloudGeometry, material );
    mesh.name = 'point_cloud';

    return { mesh };

};

export default PointCloud;
