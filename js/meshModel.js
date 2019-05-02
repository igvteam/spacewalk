import * as THREE from "./threejs_es6/three.module.js";

class MeshModel {
    constructor ({ sx, sy, sz, geometry, material }) {

        this.sx = sx;
        this.sy = sy;
        this.sz = sz;

        this.geometry = geometry;
        this.material = material;

        this.mesh = new THREE.Mesh(geometry, material);

    }

    getBBox() {
        const { sx, sy, sz } = this;
        return { sx, sy, sz }
    }

    getNiceCameraPose() {

        const [ targetX, targetY, targetZ ] = [ 0, 0, 0 ];
        const target = new THREE.Vector3(targetX, targetY, targetZ);

        const { sx, sy, sz } = this;
        const dimen = Math.max(...[sx, sy, sz]);

        const [ locationX, locationY, locationZ ] = [ dimen, dimen, dimen ];
        const position = new THREE.Vector3(locationX, locationY, locationZ);

        return { target, position }
    }

    getCameraPoseAlongAxis (axis) {

        const { sx, sy, sz } = this;
        let dimen = Math.max(...[sx, sy, sz]);

        dimen *= 2;

        const [ targetX, targetY, targetZ ] = [ 0, 0, 0 ];
        const target = new THREE.Vector3(targetX, targetY, targetZ);

        let position;

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

        position = axes[ axis ]();
        return { target, position }
    }
}

export default MeshModel;
