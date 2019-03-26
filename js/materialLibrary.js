import CubicMapManager from "./cubicMapManager.js";
import * as THREE from "./threejs_es6/three.module.js";

const specularCubicMapMaterialConfig =
    {
        // textureRoot: '../../texture/cubic/diagnostic/threejs_format/',
        // textureRoot: 'texture/cubic/specular/aerodynamics_workshop/',
        textureRoot: 'texture/cubic/diagnostic/tissot/',
        // textureRoot: 'texture/cubic/specular/skybox/',
        suffix: '.png',
        isSpecularMap: true
    };

const specularCubicMapManager = new CubicMapManager(specularCubicMapMaterialConfig);

const sceneBackgroundCubicTexture = specularCubicMapManager.cubicTexture;

const showNormalsMaterial = new THREE.MeshNormalMaterial();

const showSTMaterialConfig =
    {
        uniforms: {},
        vertexShader: document.getElementById( 'show_st_vert' ).textContent,
        fragmentShader: document.getElementById( 'show_st_frag' ).textContent
    };

const showSTMaterial = new THREE.ShaderMaterial(showSTMaterialConfig );

export { sceneBackgroundCubicTexture, showNormalsMaterial, showSTMaterial };
