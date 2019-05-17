import * as THREE from "../node_modules/three/build/three.module.js";

class MeshModel {
    constructor ({ geometry, material }) {
        this.geometry = geometry;
        this.material = material;
        this.mesh = new THREE.Mesh(geometry, material);
    }

    getBounds() {

        this.geometry.computeBoundingSphere();
        const { center, radius } = this.geometry.boundingSphere;

        this.geometry.computeBoundingBox();
        const { min, max } = this.geometry.boundingBox;

        return { min, max, center, radius }
    }

    getNiceCameraPose() {

        const { min, max, center, radius } = this.getBounds();

        const dimen = radius * 2;
        const position = new THREE.Vector3(dimen, dimen, dimen);

        return { target:center, position }
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

export default MeshModel;
