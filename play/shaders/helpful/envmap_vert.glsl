precision highp float;
precision highp int;

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
uniform float refractionRatio;

attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
attribute vec3 color;

varying vec3 vColor;
varying vec3 vReflect;

void main() {

	vColor.xyz = color.xyz;

	vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
    vec3 cameraToVertex = normalize( worldPosition.xyz - cameraPosition );

    vec3 objectNormal = vec3( normal );
    vec3 transformedNormal = normalMatrix * objectNormal;
    vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
    vReflect = reflect( cameraToVertex, worldNormal );

    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );;

}
