import * as THREE from "../node_modules/three/build/three.module.js";
import { appleCrayonColorThreeJS } from "./color.js";

class CubicMapManager {

    constructor ({ textureRoot, suffix, vertexShaderName, fragmentShaderName, isSpecularMap }) {

        this.onLoad = async () => {

            // const paths = pathsPosNegStyleWithRoot(textureRoot, suffix);
            const paths = pathsOpenEXRStyleWithRoot(textureRoot, suffix);

            const promise = new Promise(resolve => {
                new THREE.CubeTextureLoader().load(paths, resolve);
            });

            const cubicTexture = await promise;

            cubicTexture.format   = THREE.RGBFormat;
            cubicTexture.mapping  = THREE.CubeReflectionMapping;
            // cubicTexture.encoding = THREE.sRGBEncoding;

            this.cubicTexture = cubicTexture;

            this.material = isSpecularMap ? specularMaterial(cubicTexture) : diffuseMaterial(cubicTexture, vertexShaderName, fragmentShaderName);
            this.material.side = THREE.DoubleSide;

        };

    }

    async loadTexture () {
        await this.onLoad();
    }
}

function diffuseMaterial (cubicTexture, vertID, fragID) {

    const config =
        {
            uniforms:
                {
                    cubicMap:
                        {
                            value: cubicTexture
                        }
                },

            vertexShader: document.getElementById( vertID ).textContent,
            fragmentShader: document.getElementById( fragID ).textContent
        };

    return new THREE.ShaderMaterial( config );

}

function specularMaterial (cubicTexture) {

    const shaderMaterial = new THREE.MeshLambertMaterial( { color: appleCrayonColorThreeJS('snow'), envMap: cubicTexture, combine: THREE.MixOperation, reflectivity: 1 } );

    // let { uniforms, vertexShader, fragmentShader } = THREE.ShaderLib.cube;

    // const shaderMaterial = new THREE.ShaderMaterial( { uniforms, vertexShader, fragmentShader, depthWrite:false, side:THREE.BackSide } );
    // shaderMaterial.envMap = cubicTexture;

    return shaderMaterial;
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
