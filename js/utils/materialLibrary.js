import * as THREE from "three";

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

const showNormalsMaterial = new THREE.MeshNormalMaterial();

let sceneBackgroundDiagnosticTexture = undefined;
let sceneBackgroundTexture = undefined;

async function initializeMaterialLibrary() {

    shaderLibrary.init()

    const sceneBackgroundTexturePromise = new Promise(resolve => {

        const texas = new THREE.TextureLoader().load(sceneBackgroundTextureFile, resolve)
        texas.colorSpace = THREE.SRGBColorSpace

        return texas
    });

    sceneBackgroundTexture = await sceneBackgroundTexturePromise;

    // console.timeEnd(str);
    //
    // str = `Scene Background Diagnostic Texture Load Complete`;
    // console.time(str);

    const sceneBackgroundDiagnosticTexturePromise = new Promise(resolve => {
        const texas = new THREE.TextureLoader().load(sceneBackgroundDiagnosticTextureFile, resolve)
        texas.colorSpace = THREE.SRGBColorSpace

        return texas
    });

    sceneBackgroundDiagnosticTexture = await sceneBackgroundDiagnosticTexturePromise;

    // console.timeEnd(str);

}

export { initializeMaterialLibrary, sceneBackgroundDiagnosticTexture, sceneBackgroundTexture, showNormalsMaterial, shaderLibrary };
