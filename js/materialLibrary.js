import CubicMapManager from "./cubicMapManager.js";
import * as THREE from "./threejs_es6/three.module.js";

// const specularTextureRoot = 'texture/cubic/diagnostic/threejs_format/';
// const specularTextureRoot = 'texture/cubic/specular/aerodynamics_workshop/';
// const specularTextureRoot = 'texture/cubic/specular/skybox/';
const specularTextureRoot = 'texture/cubic/diagnostic/tissot/';

const specularCubicMapManager = new CubicMapManager({ textureRoot: specularTextureRoot, suffix: '.png', isSpecularMap: true });
const specularCubicTexture = specularCubicMapManager.cubicTexture;

const diffuseTextureRoot = 'texture/cubic/diffuse/tissot/';

const diffuseCubicMapManager = new CubicMapManager({
    textureRoot: diffuseTextureRoot,
    suffix: '.png',
    vertexShaderName: 'diffuse_cube_vert',
    fragmentShaderName: 'diffuse_cube_frag',
    isSpecularMap: false
});
const diffuseCubicTexture = diffuseCubicMapManager.cubicTexture;

const showNormalsMaterial = new THREE.MeshNormalMaterial();

const showSTMaterialConfig =
    {
        uniforms: {},
        vertexShader: document.getElementById( 'show_st_vert' ).textContent,
        fragmentShader: document.getElementById( 'show_st_frag' ).textContent
    };

const showSTMaterial = new THREE.ShaderMaterial(showSTMaterialConfig );

export { diffuseCubicTexture, specularCubicTexture, showNormalsMaterial, showSTMaterial };
