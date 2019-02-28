
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}

// M V P
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;

// Normal matrix
uniform mat3 normalMatrix;

//
uniform vec3 cameraPosition;

//
attribute vec3 color;
attribute vec2 uv;
attribute vec3 position;
attribute vec3 normal;

//
varying vec3 vWorldPosition;
varying vec3 vReflect;

//
varying vec3 vColor;
varying vec2 vUv;


void main() {

	vColor = color;
    vUv = uv;
    vWorldPosition = (modelMatrix * vec4( position, 1.0 )).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

	vec3 cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
	vec3 worldNormal = inverseTransformDirection( (normalMatrix * normal), viewMatrix );
	vReflect = reflect( cameraToVertex, worldNormal );
}
