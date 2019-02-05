import * as THREE from './threejs_es6/three.module.js';
class CubicMapManager {

    constructor ({ textureRoot, suffix, vertexShaderName, fragmentShaderName }) {

        const posneg = [ 'pos', 'neg' ];
        const axes = [ 'x', 'y', 'z' ];

        let names = [];
        axes.forEach((axis) => { names.push((posneg[ 0 ] + axis)); names.push(posneg[ 1 ] + axis); });

        const paths = names.map((name) => { return textureRoot + name + suffix });

        let cubeTexture = new THREE.CubeTextureLoader().load( paths );
        cubeTexture.format   = THREE.RGBFormat;
        cubeTexture.mapping  = THREE.CubeReflectionMapping;
        cubeTexture.encoding = THREE.sRGBEncoding;

        const materialConfig =
            {
                uniforms:
                    {
                        cubicMap:
                            {
                                value: cubeTexture
                            }
                    },

                vertexShader: document.getElementById( vertexShaderName   ).textContent,

                fragmentShader: document.getElementById( fragmentShaderName ).textContent
            };

        this.material = new THREE.ShaderMaterial( materialConfig );

    }

}

export default CubicMapManager;
