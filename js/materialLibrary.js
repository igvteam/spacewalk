import CubicMapManager from "./cubicMapManager.js";
import * as THREE from "../node_modules/three/build/three.module.js";

// const specularTextureRoot = 'texture/cubic/diagnostic/threejs_format/';
// const specularTextureRoot = 'texture/cubic/specular/aerodynamics_workshop/';
// const specularTextureRoot = 'texture/cubic/specular/skybox/';
const specularTextureRoot = 'texture/cubic/diagnostic/tissot/';
// const specularTextureRoot = 'texture/cubic/specular/grid/';
const specularCubicMapManager = new CubicMapManager({ textureRoot: specularTextureRoot, suffix: '.png', isSpecularMap: true });

const diffuseTextureRoot = 'texture/cubic/diffuse/tissot/';
const diffuseCubicMapManager = new CubicMapManager({
    textureRoot: diffuseTextureRoot,
    suffix: '.png',
    vertexShaderName: 'diffuse_cube_vert',
    fragmentShaderName: 'diffuse_cube_frag',
    isSpecularMap: false
});

let specularCubicTexture = undefined;
let diffuseCubicTexture = undefined;

const materialManagerLoadCubes = async () => {
    let str;

    str = `Specular Cubic Texture Load of ${ specularTextureRoot } Complete`;
    console.time(str);

    await specularCubicMapManager.loadTexture();
    specularCubicTexture = specularCubicMapManager.cubicTexture;

    console.timeEnd(str);

    str = `Diffuse Cubic Texture Load of ${ diffuseTextureRoot } Complete`;
    console.time(str);

    await specularCubicMapManager.loadTexture();
    diffuseCubicTexture = diffuseCubicMapManager.cubicTexture;

    console.timeEnd(str);

};

const showNormalsMaterial = new THREE.MeshNormalMaterial();

// ST
const showSTConfig =
    {
        uniforms: { showS:  { value: 1 }, showT:  { value: 1 } },
        vertexShader: document.getElementById( 'show_st_vert' ).textContent,
        fragmentShader: document.getElementById( 'show_st_frag' ).textContent
    };

const showSTMaterial = new THREE.ShaderMaterial(showSTConfig );

// S
const showSConfig =
    {
        uniforms: { showS:  { value: 1 }, showT:  { value: 0 } },
        vertexShader: document.getElementById( 'show_st_vert' ).textContent,
        fragmentShader: document.getElementById( 'show_st_frag' ).textContent
    };

const showSMaterial = new THREE.ShaderMaterial(showSConfig );

// T
const showTConfig =
    {
        uniforms: { showS:  { value: 0 }, showT:  { value: 1 } },
        vertexShader: document.getElementById( 'show_st_vert' ).textContent,
        fragmentShader: document.getElementById( 'show_st_frag' ).textContent
    };

const showTMaterial = new THREE.ShaderMaterial(showTConfig );

export { materialManagerLoadCubes, diffuseCubicTexture, specularCubicTexture, showNormalsMaterial, showSTMaterial, showSMaterial, showTMaterial };
