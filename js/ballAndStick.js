import * as THREE from "./threejs_es6/three.module.js";
import { sceneManager, structureManager } from "./main.js";
import { degrees } from './math.js';
import { colorDescriptionRGBOrThreeJS } from './color.js';

class BallAndStick {

    constructor () {

    }

    static getRenderStyle() {
        return 'render-style-ball-stick';
    }

    configure(structure, materialProvider, renderStyle) {

        this.dispose();
        this.balls = this.createBalls(structure, materialProvider);
        this.sticks = this.createSticks(structure);

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

    createBalls(structure, materialProvider) {

        // 3D Object dictionary. Key is string-ified genomic location.
        this.genomicLocationObjectDictionary = {};

        // segment-index dictionay. 3D Object UUID is key.
        this.indexDictionary = {};

        // 3D Object Array. Indexed by structure list index.
        this.objectList = [];

        let meshList = structure.map(obj => {

            const index = structure.indexOf(obj);

            const [ x, y, z ] = obj.xyz;

            const color = materialProvider.colorForInterpolant(index / (structure.length - 1));
            // console.log(' ball color ' + colorDescriptionThreeJS(color));

            // const material = new THREE.MeshPhongMaterial({ color, envMap: specularCubicTexture });
            const material = new THREE.MeshPhongMaterial({ color });
            // const material = new THREE.MeshBasicMaterial({ color });
            // const material = showTMaterial;

            const geometry = sceneManager.ballGeometry.clone();
            geometry.translate(x, y, z);

            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = 'ball';

            const genomicLocation = index * structureManager.stepSize + structureManager.locus.genomicStart;

            this.genomicLocationObjectDictionary[ genomicLocation.toString() ] = { object: mesh, centroid: mesh.position.clone() };

            this.indexDictionary[ mesh.uuid ] = { index, genomicLocation };

            this.objectList[ index ] = { object: mesh, genomicLocation };

            return mesh;

        });

        return { mesh: meshList };

    }

    createSticks(structure) {

        let meshList = [];

        for (let i = 0, j = 1; j < structure.length; ++i, ++j) {

            const [ x0, y0, z0 ] = structure[i].xyz;
            const [ x1, y1, z1 ] = structure[j].xyz;

            const axis = new THREE.CatmullRomCurve3([ new THREE.Vector3( x0, y0, z0 ), new THREE.Vector3( x1, y1, z1 ) ]);

            const geometry = new THREE.TubeBufferGeometry(axis, 8, sceneManager.ballRadius/4, 16, false);
            const material = sceneManager.stickMaterial.clone();

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

        let bbox = new THREE.Box3();
        this.balls.mesh.forEach(m => {
            bbox.expandByObject(m)
        });

        const { min, max } = bbox;

        let sphere = new THREE.Sphere();
        bbox.getBoundingSphere(sphere);
        const { center, radius } = sphere;

        // this.tube.geometry.computeBoundingSphere();
        // const { center, radius } = this.tube.geometry.boundingSphere;
        //
        // this.tube.geometry.computeBoundingBox();
        // const { min, max } = this.tube.geometry.boundingBox;

        return { min, max, center, radius }
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
