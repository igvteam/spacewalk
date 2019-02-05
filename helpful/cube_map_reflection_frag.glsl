varying vec3 vNormalEye;
varying vec3 vNormalWorld;
void main() {
	gl_FragColor = textureCube(envMap, vNormalWorld);
}

