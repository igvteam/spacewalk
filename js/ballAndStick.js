import * as THREE from "./threejs_es6/three.module.js";
import { sceneManager, structureManager } from "./main.js";

class BallAndStick {

    constructor () {

    }

    static getRenderStyle() {
        return 'render-style-ball-stick';
    }

    configure (structureList, renderStyle) {

        this.dispose();
        this.balls = this.createBalls(structureList);
        this.sticks = this.createSticks(structureList);

        if (renderStyle === BallAndStick.getRenderStyle()) {
            this.show();
        } else {
            this.hide();
        }
    }

    createBalls(structureList) {

        let meshList = structureList.map(structure => {

            const index = structureList.indexOf(structure);

            const [ x, y, z ] = structure.xyz;

            const color = sceneManager.colorRampPanel.colorRampWidget.colorForInterpolant(index / (structureList.length - 1));

            // const material = new THREE.MeshPhongMaterial({ color, envMap: specularCubicTexture });
            const material = new THREE.MeshPhongMaterial({ color });
            // const material = new THREE.MeshBasicMaterial({ color });
            // const material = showTMaterial;

            const geometry = sceneManager.ballGeometry.clone();
            geometry.translate(x, y, z);

            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = 'ball';

            const genomicLocation = index * structureManager.stepSize + structureManager.locus.genomicStart;

            sceneManager.genomicLocationObjectDictionary[ genomicLocation.toString() ] = { object: mesh, centroid: mesh.position.clone() };

            sceneManager.indexDictionary[ mesh.uuid ] = { index, genomicLocation };

            sceneManager.objectList[ index ] = { object: mesh, genomicLocation };

            return mesh;

        });

        return { mesh: meshList };

    }

    createSticks(structureList) {

        let meshList = [];

        for (let i = 0, j = 1; j < structureList.length; ++i, ++j) {

            const [ x0, y0, z0 ] = structureList[i].xyz;
            const [ x1, y1, z1 ] = structureList[j].xyz;

            const axis = new THREE.CatmullRomCurve3([ new THREE.Vector3( x0, y0, z0 ), new THREE.Vector3( x1, y1, z1 ) ]);

            const geometry = new THREE.TubeBufferGeometry(axis, 8, sceneManager.ballRadius/8, 16, false);
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

        return { target:center, position }
    }
}

let setVisibility = (objects, isVisible) => {
    objects.forEach(object => object.visible = isVisible);
};

export default BallAndStick;
