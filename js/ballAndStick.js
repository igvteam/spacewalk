import * as THREE from "./threejs_es6/three.module.js";
import { sceneManager, structureManager } from "./main.js";

class BallAndStick {

    constructor () {

    }

    static getRenderStyle() {
        return 'render-style-ball-stick';
    }

    configure (structureList, renderStyle) {

        if (this.disposable) {
            this.disposable.forEach(item => {
                item.dispose()
            })
        }

        this.disposable = [];

        this.balls = this.createBalls(structureList);
        this.sticks = this.createSticks(structureList);

        if (renderStyle === BallAndStick.getRenderStyle()) {
            this.show();
        } else {
            this.hide();
        }
    }

    createBalls(structureList) {

        return structureList.map(structure => {

            const index = structureList.indexOf(structure);

            const [ x, y, z ] = structure.xyz;

            const color = sceneManager.colorRampPanel.colorRampWidget.colorForInterpolant(index / (structureList.length - 1));

            // const ballMaterial = new THREE.MeshPhongMaterial({ color, envMap: specularCubicTexture });
            const ballMaterial = new THREE.MeshPhongMaterial({ color });
            // const ballMaterial = new THREE.MeshBasicMaterial({ color });
            // const ballMaterial = showTMaterial;
            this.disposable.push(ballMaterial);

            const ballMesh = new THREE.Mesh(sceneManager.ballGeometry, ballMaterial);
            ballMesh.position.set(x, y, z);

            const genomicLocation = index * structureManager.stepSize + structureManager.locus.genomicStart;

            sceneManager.genomicLocationObjectDictionary[ genomicLocation.toString() ] = { object: ballMesh, centroid: ballMesh.position.clone() };

            sceneManager.indexDictionary[ ballMesh.uuid ] = { index, genomicLocation };

            sceneManager.objectList[ index ] = { object: ballMesh, genomicLocation };

            ballMesh.name = 'ball';

            return ballMesh;

        });

    }

    createSticks(structureList) {

        let sticks = [];

        for (let i = 0, j = 1; j < structureList.length; ++i, ++j) {

            const [ x0, y0, z0 ] = structureList[i].xyz;
            const [ x1, y1, z1 ] = structureList[j].xyz;

            const axis = new THREE.CatmullRomCurve3([ new THREE.Vector3( x0, y0, z0 ), new THREE.Vector3( x1, y1, z1 ) ]);

            const stickGeometry = new THREE.TubeBufferGeometry(axis, 8, sceneManager.ballRadius/8, 16, false);
            this.disposable.push(stickGeometry);

            const stickMaterial = sceneManager.stickMaterial.clone();
            this.disposable.push(stickMaterial);

            const stickMesh = new THREE.Mesh(stickGeometry, stickMaterial);

            stickMesh.name = 'stick';

            sticks.push(stickMesh);

        }

        return sticks;
    }

    addToScene (scene) {
        this.balls.forEach(ball => scene.add(ball));
        this.sticks.forEach(stick => scene.add(stick));
    }

    renderLoopHelper () {
        // do stuff
    }

    hide () {
        setVisibility(this.balls, false);
        setVisibility(this.sticks, false);
    }

    show () {
        setVisibility(this.balls, true);
        setVisibility(this.sticks, true);
    }
}

let setVisibility = (objects, isVisible) => {
    objects.forEach(object => object.visible = isVisible);
};

export default BallAndStick;
