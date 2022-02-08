#version 120

varying vec2 vST;
void main() {
    vST = uv;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4( position, 1.0 );
}
