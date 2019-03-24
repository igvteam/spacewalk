import CubicMapManager from "./cubicMapManager.js";
import * as THREE from "./threejs_es6/three.module.js";

const diffuseCubicMapMaterialConfig =
    {
        // textureRoot: 'texture/cubic/diffuse/aerodynamics_workshop/',
        textureRoot: 'texture/cubic/diagnostic/threejs_format/',
        suffix: '.png',
        vertexShaderName: 'diffuse_cube_vert',
        fragmentShaderName: 'diffuse_cube_frag',
        isSpecularMap: false
    };

const cubicMapManager = new CubicMapManager(diffuseCubicMapMaterialConfig);
const cubicMapMaterial = cubicMapManager.material;


const showNormalsMaterial = new THREE.MeshNormalMaterial();

const showSTMaterialConfig =
    {
        uniforms: {},
        vertexShader: document.getElementById( 'show_st_vert' ).textContent,
        fragmentShader: document.getElementById( 'show_st_frag' ).textContent
    };

const showSTMaterial = new THREE.ShaderMaterial(showSTMaterialConfig );

export { cubicMapMaterial, showNormalsMaterial, showSTMaterial };
