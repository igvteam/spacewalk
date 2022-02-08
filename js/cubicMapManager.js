import * as THREE from "three";
import { appleCrayonColorThreeJS } from "./color.js";

class CubicMapManager {

    constructor ({ textureRoot, suffix, vertexShader, fragmentShader, isSpecularMap }) {

        this.onLoad = async () => {

            // const paths = pathsPosNegStyleWithRoot(textureRoot, suffix);
            const paths = pathsOpenEXRStyleWithRoot(textureRoot, suffix);

            const promise = new Promise(resolve => {
                new THREE.CubeTextureLoader().setPath(textureRoot).load(paths, resolve);
            });

            const cubicTexture = await promise;

            cubicTexture.format   = THREE.RGBFormat;
            cubicTexture.mapping  = THREE.CubeReflectionMapping;
            // cubicTexture.encoding = THREE.sRGBEncoding;

            this.cubicTexture = cubicTexture;

            this.material = isSpecularMap ? specularMaterial(cubicTexture) : diffuseMaterial(cubicTexture, vertexShader, fragmentShader);
            this.material.side = THREE.DoubleSide;

        };

    }

    async loadTexture () {
        const message = await this.onLoad();
        if (message) {
            console.log(message);
        }
    }
}

function diffuseMaterial (cubicTexture, vertexShader, fragmentShader) {

    const config =
        {
            uniforms:
                {
                    cubicMap:
                        {
                            value: cubicTexture
                        }
                },

            vertexShader,
            fragmentShader
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

    const parts = root.split('/').filter(string => '' !== string);
    const name = parts.pop();
    const posneg = [ 'pos', 'neg' ];
    const axes = [ 'X', 'Y', 'Z' ];

    let names = [];
    axes.forEach((axis) => names.push(`${ name }${ posneg[ 0 ] }${ axis }${ suffix }`, `${ name }${ posneg[ 1 ] }${ axis }${ suffix }`) );

    return names;

}

function pathsOpenEXRStyleWithRoot(root, suffix) {

    const parts = root.split('/').filter(string => '' !== string);
    const name = parts.pop();
    const posneg = [ '+', '-' ];
    const axes = [ 'X', 'Y', 'Z' ];

    let names = [];
    axes.forEach((axis) => names.push(`${ name }${ posneg[ 0 ] }${ axis }${ suffix }`, `${ name }${ posneg[ 1 ] }${ axis }${ suffix }`) );

    return names;

}

export default CubicMapManager;
