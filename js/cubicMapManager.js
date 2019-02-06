import * as THREE from './threejs_es6/three.module.js';
class CubicMapManager {

    constructor ({ textureRoot, suffix, vertexShaderName, fragmentShaderName }) {

        // const paths = pathsPosNegStyleWithRoot(textureRoot, suffix);
        const paths = pathsOpenEXRStyleWithRoot(textureRoot, suffix);

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
        this.material.side = THREE.DoubleSide;

    }

}

function pathsPosNegStyleWithRoot(root, suffix) {

    const posneg = [ 'pos', 'neg' ];
    const axes = [ 'x', 'y', 'z' ];

    let names = [];
    axes.forEach((axis) => { names.push((posneg[ 0 ] + axis)); names.push(posneg[ 1 ] + axis); });

    const paths = names.map((name) => { return root + name + suffix });

    return paths;

}

function pathsOpenEXRStyleWithRoot(root, suffix) {

    let pieces = root.split('/').filter((piece) => { return "" !== piece && '..' !== piece });
    let prefix = pieces.pop();
    if ('' === prefix) {
        prefix = pieces.pop();
    }
    const posneg = [ '+', '-' ];
    const axes = [ 'X', 'Y', 'Z' ];

    let names = [];
    axes.forEach((axis) => { names.push((prefix + posneg[ 0 ] + axis)); names.push(prefix + posneg[ 1 ] + axis); });

    const paths = names.map((name) => { return root + name + suffix });

    return paths;

}

export default CubicMapManager;
