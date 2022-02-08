import CubicMapManager from "./cubicMapManager.js";
import * as THREE from "three";

import show_st_vert from '../glsl/show_st.vert'
import show_st_frag from '../glsl/show_st.frag'

import diffuse_cube_vert from '../glsl/diffuse_cube.vert'
import diffuse_cube_frag from '../glsl/diffuse_cube.frag'

import sceneBackgroundDiagnosticTextureFile from '/texture/uv.png'
import sceneBackgroundTextureFile from '/texture/scene-backdrop-grey-ramp.png'

const shaderLibrary =
    {
        init: () => {

            // ST
            const showSTConfig =
                {
                    uniforms: { showS:  { value: 1 }, showT:  { value: 1 } },
                    vertexShader: show_st_vert,
                    fragmentShader: show_st_frag
                }

            shaderLibrary.showSTMaterial = new THREE.ShaderMaterial(showSTConfig )

            // S
            const showSConfig =
                {
                    uniforms: { showS:  { value: 1 }, showT:  { value: 0 } },
                    vertexShader: show_st_vert,
                    fragmentShader: show_st_frag
                }

            shaderLibrary.showSMaterial = new THREE.ShaderMaterial(showSConfig )

            // T
            const showTConfig =
                {
                    uniforms: { showS:  { value: 0 }, showT:  { value: 1 } },
                    vertexShader: show_st_vert,
                    fragmentShader: show_st_frag
                }

            shaderLibrary.showTMaterial = new THREE.ShaderMaterial(showTConfig )

        },

        showSTMaterial: undefined,

        showSMaterial: undefined,

        showTMaterial: undefined

    }

// const specularTextureRoot = '/texture/cubic/diagnostic/threejs_format/';
// const specularTextureRoot = '/texture/cubic/specular/aerodynamics_workshop/';
// const specularTextureRoot = '/texture/cubic/specular/skybox/';
const specularTextureRoot = '/texture/cubic/diagnostic/tissot/';
// const specularTextureRoot = '/texture/cubic/specular/grid/';
const specularCubicMapManager = new CubicMapManager({ textureRoot: specularTextureRoot, suffix: '.png', isSpecularMap: true });

const diffuseTextureRoot = '/texture/cubic/diagnostic/tissot/';
const diffuseCubicMapManager = new CubicMapManager({
    textureRoot: diffuseTextureRoot,
    suffix: '.png',
    vertexShader: diffuse_cube_vert,
    fragmentShader: diffuse_cube_frag,
    isSpecularMap: false
});

let specularCubicTexture = undefined;
let diffuseCubicTexture = undefined;

const showNormalsMaterial = new THREE.MeshNormalMaterial();

let sceneBackgroundDiagnosticTexture = undefined;
let sceneBackgroundTexture = undefined;

const initializeMaterialLibrary = async () => {

    shaderLibrary.init()

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

    str = `Scene Background Texture Load Complete`;
    console.time(str);

    const sceneBackgroundTexturePromise = new Promise(resolve => {
        new THREE.TextureLoader().load(sceneBackgroundTextureFile, resolve);
    });

    sceneBackgroundTexture = await sceneBackgroundTexturePromise;

    console.timeEnd(str);

    str = `Scene Background Diagnostic Texture Load Complete`;
    console.time(str);

    const sceneBackgroundDiagnosticTexturePromise = new Promise(resolve => {
        new THREE.TextureLoader().load(sceneBackgroundDiagnosticTextureFile, resolve);
    });

    sceneBackgroundDiagnosticTexture = await sceneBackgroundDiagnosticTexturePromise;

    console.timeEnd(str);

};

export { initializeMaterialLibrary, sceneBackgroundDiagnosticTexture, sceneBackgroundTexture, diffuseCubicTexture, specularCubicTexture, showNormalsMaterial, shaderLibrary };
