import CubicMapManager from "./cubicMapManager.js";
import * as THREE from "three";

// const specularTextureRoot = 'texture/cubic/diagnostic/threejs_format/';
// const specularTextureRoot = 'texture/cubic/specular/aerodynamics_workshop/';
// const specularTextureRoot = 'texture/cubic/specular/skybox/';
const specularTextureRoot = 'texture/cubic/diagnostic/tissot/';
// const specularTextureRoot = 'texture/cubic/specular/grid/';
const specularCubicMapManager = new CubicMapManager({ textureRoot: specularTextureRoot, suffix: '.png', isSpecularMap: true });

const diffuseTextureRoot = 'texture/cubic/diagnostic/tissot/';
const diffuseCubicMapManager = new CubicMapManager({
    textureRoot: diffuseTextureRoot,
    suffix: '.png',
    vertexShaderName: 'diffuse_cube_vert',
    fragmentShaderName: 'diffuse_cube_frag',
    isSpecularMap: false
});

let specularCubicTexture = undefined;
let diffuseCubicTexture = undefined;

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

const sceneBackgroundDiagnosticTextureFile = 'texture/uv.png';
let sceneBackgroundDiagnosticTexture = undefined;

const sceneBackgroundTextureFile = 'texture/scene-backdrop-grey-ramp.png';
let sceneBackgroundTexture = undefined;

const initializeMaterialLibrary = async () => {

    let str;

    str = `Specular Cubic Texture Load of ${ specularTextureRoot } Complete`;
    console.time(str);

    await specularCubicMapManager.loadTexture();
    specularCubicTexture = specularCubicMapManager.cubicTexture;

    console.timeEnd(str);

    str = `Diffuse Cubic Texture Load of ${ diffuseTextureRoot } Complete`;
    console.time(str);

    await diffuseCubicMapManager.loadTexture();
    diffuseCubicTexture = diffuseCubicMapManager.cubicTexture;

    console.timeEnd(str);

    str = `Scene Background Texture Load of ${ sceneBackgroundTextureFile } Complete`;
    console.time(str);

    const sceneBackgroundTexturePromise = new Promise(resolve => {
        new THREE.TextureLoader().load(sceneBackgroundTextureFile, resolve);
    });

    sceneBackgroundTexture = await sceneBackgroundTexturePromise;

    console.timeEnd(str);

    str = `Scene Background Diagnostic Texture Load of ${ sceneBackgroundDiagnosticTextureFile } Complete`;
    console.time(str);

    const sceneBackgroundDiagnosticTexturePromise = new Promise(resolve => {
        new THREE.TextureLoader().load(sceneBackgroundDiagnosticTextureFile, resolve);
    });

    sceneBackgroundDiagnosticTexture = await sceneBackgroundDiagnosticTexturePromise;

    console.timeEnd(str);

};

export { initializeMaterialLibrary, sceneBackgroundDiagnosticTexture, sceneBackgroundTexture, diffuseCubicTexture, specularCubicTexture, showNormalsMaterial, showSTMaterial, showSMaterial, showTMaterial };
