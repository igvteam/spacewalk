import * as THREE from "../node_modules/three/build/three.module.js";
import { degrees } from './math.js';
import { globals } from "./app.js";
import EnsembleManager from "./ensembleManager.js";

class BallAndStick {

    constructor () {
        this.stickCurves = undefined;
    }

    static getRenderStyle() {
        return 'render-style-ball-stick';
    }

    configure(trace) {

        this.dispose();

        this.trace = trace;
        this.balls = this.createBalls(trace);
        this.sticks = this.createSticks(trace);

        if (globals.sceneManager.renderStyle === BallAndStick.getRenderStyle()) {
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

            const { interpolant } = this.meshUUID_ColorRampInterpolantWindow_Dictionary[ mesh.uuid ];

            const color = materialProvider.colorForInterpolant(interpolant);

            mesh.material = new THREE.MeshPhongMaterial({ color });
        });
    }

    createBalls(trace) {

        // Segment ID dictionay. 3D Object UUID is key.
        this.meshUUID_ColorRampInterpolantWindow_Dictionary = {};

        return trace.geometry.vertices.map((vertex, index) => {

            const geometry = new THREE.SphereBufferGeometry(1, 32, 16);

            const mesh = new THREE.Mesh(geometry, trace.colorRampInterpolantWindows[ index ].material);

            mesh.name = 'ball';

            const { x, y, z } = vertex;
            mesh.position.set(x, y, z);
            mesh.scale.setScalar(globals.sceneManager.ballRadius());

            this.meshUUID_ColorRampInterpolantWindow_Dictionary[ mesh.uuid ] = trace.colorRampInterpolantWindows[ index ];

            return mesh;

        });

    }

    createSticks(trace) {

        if (undefined === this.stickCurves) {
            this.stickCurves = createStickCurves(trace.geometry.vertices);
        }

        let meshes = [];

        for (let curve of this.stickCurves) {

            const geometry = new THREE.TubeBufferGeometry(curve, 8, 0.25 * globals.sceneManager.ballRadius(), 16, false);
            const material = globals.sceneManager.stickMaterial.clone();

            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = 'stick';

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

    updateBallRadius(radius) {

        for (let mesh of this.balls) {
            mesh.scale.setScalar(radius);
        }

    }

    updateStickRadius(radius) {

        for (let i = 0; i < this.stickCurves.length; i++) {
            this.sticks[ i ].geometry.copy(new THREE.TubeBufferGeometry(this.stickCurves[i], 8, radius, 16, false));
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

        delete this.stickCurves;
    }

    getThumbnailGeometryList () {

        let bg = this.balls.map(m => m.geometry);
        let sg = this.sticks.map(m => m.geometry);

        let g = [ ...bg, ...sg ];

        return g;
    }

    getBounds() {
        return EnsembleManager.getBoundsWithTrace(this.trace);
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

const createStickCurves = (vertices) => {

    let curves = [];
    for (let i = 0, j = 1; j < vertices.length; ++i, ++j) {
        curves.push( new THREE.CatmullRomCurve3([ vertices[i], vertices[j] ]) );
    }

    return curves;
};

let setVisibility = (objects, isVisible) => {
    objects.forEach(object => object.visible = isVisible);
};

export default BallAndStick;
