import * as THREE from "../node_modules/three/build/three.module.js";
import Globals from './globals.js';
import { getBoundsWithTrace } from './ensembleManager.js';
import { degrees } from './math.js';

class BallAndStick {

    constructor () {

    }

    static getRenderStyle() {
        return 'render-style-ball-stick';
    }

    configure(trace) {

        this.dispose();

        this.trace = trace;
        this.balls = this.createBalls(trace);
        this.sticks = this.createSticks(trace);

        if (Globals.sceneManager.renderStyle === BallAndStick.getRenderStyle()) {
            this.show();
        } else {
            this.hide();
        }
    }

    updateMaterialProvider (materialProvider) {

        if (undefined === this.balls) {
            return;
        }

        this.balls.forEach(mesh => {
            const { segmentID, genomicLocation } = this.objectSegmentDictionary[ mesh.uuid ];
            const color = materialProvider.colorForSegment({ segmentID, genomicLocation });

            mesh.material = new THREE.MeshPhongMaterial({ color });
        });
    }

    createBalls(trace) {

        // Segment ID dictionay. 3D Object UUID is key.
        this.objectSegmentDictionary = {};

        // 3D Object dictionary. Segment ID is key.
        this.segmentObjectDictionary = {};

        return trace.geometry.vertices.map((vertex, index) => {

            const { segmentID, genomicLocation } = trace.segmentList[ index ];

            const color = Globals.sceneManager.materialProvider.colorForSegment({ segmentID, genomicLocation });
            const material = new THREE.MeshPhongMaterial({ color });

            const geometry = new THREE.SphereBufferGeometry(1, 32, 16);

            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = 'ball';

            const { x, y, z } = vertex;
            mesh.position.set(x, y, z);
            mesh.scale.setScalar(Globals.sceneManager.ballRadius());

            this.objectSegmentDictionary[ mesh.uuid ] = { segmentID, genomicLocation };

            const key = segmentID.toString();
            this.segmentObjectDictionary[ key ] = { object: mesh, genomicLocation };

            return mesh;

        });

    }

    createSticks(trace) {

        let meshes = [];

        for (let i = 0, j = 1; j < trace.geometry.vertices.length; ++i, ++j) {

            const axis = new THREE.CatmullRomCurve3([ trace.geometry.vertices[ i ].clone(), trace.geometry.vertices[ j ].clone() ]);

            const geometry = new THREE.TubeBufferGeometry(axis, 8, 0.25 * Globals.sceneManager.ballRadius(), 16, false);
            const material = Globals.sceneManager.stickMaterial.clone();

            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = 'stick';

            // mesh.scale.setScalar(0.25 * Globals.sceneManager.ballRadius);

            meshes.push(mesh);
        }

        return meshes;
    }

    addToScene (scene) {
        this.balls.forEach(m => scene.add(m));
        this.sticks.forEach(m => scene.add(m));
    }

    renderLoopHelper () {

        // if (this.balls) {
        //     for (let mesh of this.balls) {
        //         mesh.geometry.attributes.position.needsUpdate = true;
        //         mesh.geometry.attributes.normal.needsUpdate = true;
        //         mesh.geometry.attributes.uv.needsUpdate = true;
        //     }
        // }

    }

    hide () {
        setVisibility(this.balls, false);
        setVisibility(this.sticks, false);
    }

    show () {
        setVisibility(this.balls, true);
        setVisibility(this.sticks, true);
    }

    updateRadius(radius) {

        for (let mesh of this.balls) {
            mesh.scale.setScalar(radius);
        }

         for (let i = 0, j = 1; j < this.trace.geometry.vertices.length; ++i, ++j) {
            const axis = new THREE.CatmullRomCurve3([ this.trace.geometry.vertices[ i ].clone(), this.trace.geometry.vertices[ j ].clone() ]);
            this.sticks[ i ].geometry.copy(new THREE.TubeBufferGeometry(axis, 8, 0.25 * radius, 16, false));
         }

    }

    dispose () {

        if (this.balls) {
            for (let mesh of this.balls) {
                mesh.geometry.dispose();
                mesh.material.dispose();
            }
        }

        if (this.sticks) {
            for (let mesh of this.sticks) {
                mesh.geometry.dispose();
                mesh.material.dispose();
            }
        }

    }

    getThumbnailGeometryList () {

        let bg = this.balls.map(m => m.geometry);
        let sg = this.sticks.map(m => m.geometry);

        let g = [ ...bg, ...sg ];

        return g;
    }

    getBounds() {
        return getBoundsWithTrace(this.trace);
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

let setVisibility = (objects, isVisible) => {
    objects.forEach(object => object.visible = isVisible);
};

export default BallAndStick;
