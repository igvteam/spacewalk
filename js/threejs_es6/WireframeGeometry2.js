import * as THREE from './three.module.js';
import LineSegmentsGeometry from './LineSegmentsGeometry.js';

/**
 * @author WestLangley / http://github.com/WestLangley
 *
 */

export default function WireframeGeometry2( geometry ) {

	LineSegmentsGeometry.call( this );

	this.type = 'WireframeGeometry2';

	this.fromWireframeGeometry( new THREE.WireframeGeometry( geometry ) );

	// set colors, maybe

};

WireframeGeometry2.prototype = Object.assign( Object.create( LineSegmentsGeometry.prototype ), {

	constructor:WireframeGeometry2,

	isWireframeGeometry2: true,

	copy: function ( source ) {

		// todo

		return this;

	}

} );
