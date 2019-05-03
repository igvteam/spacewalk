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

        let geometryList = [];
        let materialList = [];

        let meshList = structureList.map(structure => {

            const index = structureList.indexOf(structure);

            const [ x, y, z ] = structure.xyz;

            const color = sceneManager.colorRampPanel.colorRampWidget.colorForInterpolant(index / (structureList.length - 1));

            // const material = new THREE.MeshPhongMaterial({ color, envMap: specularCubicTexture });
            const material = new THREE.MeshPhongMaterial({ color });
            // const material = new THREE.MeshBasicMaterial({ color });
            // const material = showTMaterial;

            materialList.push(material);

            const geometry = sceneManager.ballGeometry.clone();
            geometry.translate(x, y, z);
            geometryList.push(material);

            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = 'ball';

            const genomicLocation = index * structureManager.stepSize + structureManager.locus.genomicStart;

            sceneManager.genomicLocationObjectDictionary[ genomicLocation.toString() ] = { object: mesh, centroid: mesh.position.clone() };

            sceneManager.indexDictionary[ mesh.uuid ] = { index, genomicLocation };

            sceneManager.objectList[ index ] = { object: mesh, genomicLocation };

            return mesh;

        });

        return { mesh: meshList, geometry: geometryList, material: materialList };

    }

    createSticks(structureList) {

        let geometryList = [];
        let materialList = [];
        let meshList = [];

        for (let i = 0, j = 1; j < structureList.length; ++i, ++j) {

            const [ x0, y0, z0 ] = structureList[i].xyz;
            const [ x1, y1, z1 ] = structureList[j].xyz;

            const axis = new THREE.CatmullRomCurve3([ new THREE.Vector3( x0, y0, z0 ), new THREE.Vector3( x1, y1, z1 ) ]);

            const geometry = new THREE.TubeBufferGeometry(axis, 8, sceneManager.ballRadius/8, 16, false);
            geometryList.push(geometry);

            const material = sceneManager.stickMaterial.clone();
            materialList.push(material);

            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = 'stick';

            meshList.push(mesh);

        }

        return { mesh: meshList, geometry: geometryList, material: materialList };
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
            let { geometry, material } = this.balls;
            geometry.forEach(g => g.dispose());
            material.forEach(m => m.dispose());
        }

        if (this.sticks) {
            let { geometry, material } = this.sticks;
            geometry.forEach(g => g.dispose());
            material.forEach(m => m.dispose());
        }

    }

    getThumbnailGeometryList () {
        // return [ ...this.balls.geometry,  ...this.sticks.geometry ];
        return this.sticks.geometry;
    }

}

let setVisibility = (objects, isVisible) => {
    objects.forEach(object => object.visible = isVisible);
};

export default BallAndStick;
