
class CubicMapShader {

    constructor ({ textureRoot, suffix, vertexShaderName, fragmentShaderName }) {

        const posneg = [ 'pos', 'neg' ];
        const axes = [ 'x', 'y', 'z' ];

        let names = [];
        axes.forEach((axis) => { names.push((posneg[ 0 ] + axis)); names.push(posneg[ 1 ] + axis); });

        const [ root, suffix ] = [ textureRoot, suffix ];
        const paths = names.map((name) => { return root + name + suffix });

        let cubeTexture = new THREE.CubeTextureLoader().load( paths );
        cubeTexture.format   = THREE.RGBFormat;
        cubeTexture.mapping  = THREE.CubeReflectionMapping;
        cubeTexture.encoding = THREE.sRGBEncoding;

        this.vertexShader   = document.getElementById( vertexShaderName ).textContent;
        this.fragmentShader = document.getElementById( fragmentShaderName ).textContent;

    }

}

export default CubicMapShader;
