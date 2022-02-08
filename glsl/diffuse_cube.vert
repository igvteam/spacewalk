#version 120

vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
    return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}

// vNormalWorldSpace - world space
varying vec3 vNormalWorldSpace;

// vNormalEyeSpace - the eye space normal
varying vec3 vNormalEyeSpace;
void main() {

    // Use the normalMatrix to convert the world space normal eye space
    // normalMatrix = transpose( inverse( modelViewMatrix ) )
    vNormalEyeSpace = normalMatrix * vec4(normal, 1.0).xyz;

    vNormalWorldSpace = inverseTransformDirection(vNormalEyeSpace, viewMatrix);

    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4( position, 1.0 );
}
