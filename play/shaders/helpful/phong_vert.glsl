#define GAMMA_FACTOR 2

vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}

vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}

uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;

attribute vec3 color;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

varying vec3 vColor;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec2 vUv;

varying vec3 vReflect;


void main() {

	vUv = uv;
	vColor.xyz = color.xyz;

    vec3 normalEye = normalMatrix * normal;

    vec4 positionEye = modelViewMatrix * vec4( position, 1.0 );

    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

	vViewPosition = -positionEye.xyz;

	vec4 positionWorld = modelMatrix * vec4( position, 1.0 );
	vWorldPosition = positionWorld.xyz;

	vec3 cameraToVertex = normalize( positionWorld.xyz - cameraPosition );
	vec3 normalWorld = inverseTransformDirection( normalEye, viewMatrix );

	vReflect = reflect( cameraToVertex, normalWorld );

}
