
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}

varying vec3 vNormalEye;
varying vec3 vNormalWorld;
void main() {

	vNormalEye = normalMatrix * normal;
	vNormalWorld = inverseTransformDirection(vNormalEye, viewMatrix);

	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

}

