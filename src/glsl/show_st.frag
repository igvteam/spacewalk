#version 120

uniform int showS;
uniform int showT;
varying vec2 vST;
void main() {

    if (showS == 1 && showT == 1) {
        gl_FragColor = vec4(vST.s, vST.t, 0.0, 1.0);
    } else if (showS == 1 && showT == 0) {
        gl_FragColor = vec4(vST.s, 0.0, 0.0, 1.0);
    } else if (showS == 0 && showT == 1){
        gl_FragColor = vec4(0.0, vST.t, 0.0, 1.0);
    } else {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    }
}
