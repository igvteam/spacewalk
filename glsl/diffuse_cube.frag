#version 120

uniform samplerCube cubicMap;
varying vec3 vNormalWorldSpace;
varying vec3 vNormalEyeSpace;
void main() {
    vec3 index = vec3(-vNormalWorldSpace.x, vNormalWorldSpace.y, vNormalWorldSpace.z);
    vec3 rgb = textureCube(cubicMap, index).rgb;
    gl_FragColor = vec4(rgb, 1.0);
}
