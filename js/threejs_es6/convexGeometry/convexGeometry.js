import * as THREE from "../../../node_modules/three/build/three.module.js";
import ConvexBufferGeometry from './convexBufferGeometry.js';

class ConvexGeometry extends THREE.Geometry {

    constructor(points) {

        super();

        this.fromBufferGeometry( new ConvexBufferGeometry( points ) );
        this.mergeVertices();

    }

}

export default ConvexGeometry;
