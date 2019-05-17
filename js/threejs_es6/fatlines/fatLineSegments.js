import * as THREE from "../../../node_modules/three/build/three.module.js";
import FatLineSegmentsGeometry from "./fatLineSegmentsGeometry.js";
import FatLineMaterial from "./fatLineMaterial.js";

class FatLineSegments extends THREE.Mesh {

    constructor(geometry, material) {

        super();

        this.type = 'FatLineSegments';
        this.isFatLineSegments = true;

        this.geometry = geometry !== undefined ? geometry : new FatLineSegmentsGeometry();
        this.material = material !== undefined ? material : new FatLineMaterial( { color: Math.random() * 0xffffff } );

    }

    computeLineDistances () {

        let { instanceStart, instanceEnd } = this.geometry.attributes;
        let { count } = instanceStart.data;

        let lineDistances = new Float32Array( 2 * instanceStart.data.count );

        let start = new THREE.Vector3();
        let end = new THREE.Vector3();

        for ( let i = 0, j = 0, l = count; i < l; i ++, j += 2 ) {

            start.fromBufferAttribute( instanceStart, i );
            end.fromBufferAttribute( instanceEnd, i );

            lineDistances[ j ] = ( j === 0 ) ? 0 : lineDistances[ j - 1 ];
            lineDistances[ j + 1 ] = lineDistances[ j ] + start.distanceTo( end );

        }

        let instanceDistanceBuffer = new THREE.InstancedInterleavedBuffer( lineDistances, 2, 1 ); // d0, d1

        this.geometry.addAttribute( 'instanceDistanceStart', new THREE.InterleavedBufferAttribute( instanceDistanceBuffer, 1, 0 ) ); // d0
        this.geometry.addAttribute( 'instanceDistanceEnd', new THREE.InterleavedBufferAttribute( instanceDistanceBuffer, 1, 1 ) ); // d1

        return this;

    }

}

export default FatLineSegments;
