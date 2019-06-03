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

    configure(trace, materialProvider, renderStyle) {

        this.dispose();

        this.trace = trace;
        this.balls = this.createBalls(trace, materialProvider);
        this.sticks = this.createSticks(trace);

        if (renderStyle === BallAndStick.getRenderStyle()) {
            this.show();
        } else {
            this.hide();
        }
    }

    updateMaterialProvider (materialProvider) {

        if (undefined === this.balls) {
            return;
        }

        this.balls.mesh.forEach((m, i, array) => {
            const interpolant = i / (array.length - 1);
            const color = materialProvider.colorForInterpolant(interpolant);
            m.material = new THREE.MeshPhongMaterial({ color });
        });
    }

    createBalls(trace, materialProvider) {

        // 3D Object dictionary. Key is string-ified genomic location.
        this.genomicLocationObjectDictionary = {};

        // segment-index dictionay. 3D Object UUID is key.
        this.indexDictionary = {};

        // 3D Object Array. Indexed by trace index in ensemble array.
        this.objectList = [];

        let meshList = trace.geometry.vertices.map((vertex, index, array) => {

            const color = materialProvider.colorForInterpolant(index / (array.length - 1));

            // const material = new THREE.MeshPhongMaterial({ color, envMap: specularCubicTexture });
            const material = new THREE.MeshPhongMaterial({ color });
            // const material = new THREE.MeshBasicMaterial({ color });
            // const material = showTMaterial;

            const geometry = Globals.sceneManager.ballGeometry.clone();
            const { x, y, z } = vertex;
            geometry.translate(x, y, z);

            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = 'ball';

            const genomicLocation = index * Globals.ensembleManager.stepSize + Globals.ensembleManager.locus.genomicStart;

            this.genomicLocationObjectDictionary[ genomicLocation.toString() ] = { object: mesh, centroid: mesh.position.clone() };

            this.indexDictionary[ mesh.uuid ] = { index, genomicLocation };

            this.objectList[ index ] = { object: mesh, genomicLocation };

            return mesh;

        });

        return { mesh: meshList };

    }

    createSticks(trace) {

        let meshList = [];

        for (let i = 0, j = 1; j < trace.geometry.vertices.length; ++i, ++j) {

            const axis = new THREE.CatmullRomCurve3([ trace.geometry.vertices[ i ].clone(), trace.geometry.vertices[ j ].clone() ]);

            const geometry = new THREE.TubeBufferGeometry(axis, 8, Globals.sceneManager.ballRadius/4, 16, false);
            const material = Globals.sceneManager.stickMaterial.clone();

            const mesh = new THREE.Mesh(geometry, material);

            mesh.name = 'stick';

            meshList.push(mesh);
        }

        return { mesh: meshList };
    }

    addToScene (scene) {
        this.balls.mesh.forEach(m => scene.add(m));
        this.sticks.mesh.forEach(m => scene.add(m));
    }

    renderLoopHelper () {
        // do stuff
    }

    hide () {
        setVisibility(this.balls.mesh, false);
        setVisibility(this.sticks.mesh, false);
    }

    show () {
        setVisibility(this.balls.mesh, true);
        setVisibility(this.sticks.mesh, true);
    }

    dispose () {

        if (this.balls) {
            let geometry = this.balls.mesh.map(m => m.geometry);
            let material = this.balls.mesh.map(m => m.material);
            geometry.forEach(g => g.dispose());
            material.forEach(m => m.dispose());
        }

        if (this.sticks) {
            let geometry = this.sticks.mesh.map(m => m.geometry);
            let material = this.sticks.mesh.map(m => m.material);
            geometry.forEach(g => g.dispose());
            material.forEach(m => m.dispose());
        }

    }

    getThumbnailGeometryList () {

        let bg = this.balls.mesh.map(m => m.geometry);
        let sg = this.sticks.mesh.map(m => m.geometry);

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
