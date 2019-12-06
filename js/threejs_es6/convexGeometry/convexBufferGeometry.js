import * as THREE from "../../../node_modules/three/build/three.module.js";
import { ConvexHull } from './convexHull.js';

class ConvexBufferGeometry extends THREE.BufferGeometry {

    constructor(points) {

        super();

        const convexHull = new ConvexHull().setFromPoints( points );

        const vertices = [];
        const normals = [];
        for ( let face of convexHull.faces) {

            let edge = face.edge;

            // we move along a doubly-connected edge list to access all face points (see HalfEdge docs)

            do {

                const point = edge.head().point;

                vertices.push( point.x, point.y, point.z );
                normals.push( face.normal.x, face.normal.y, face.normal.z );

                edge = edge.next;

            } while ( edge !== face.edge );

        }

        this.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        this.setAttribute('normal',   new THREE.Float32BufferAttribute(normals,  3));

    }
}

export default ConvexBufferGeometry;
