import * as THREE from "../../node_modules/three/build/three.module.js";

const instanceColorString = 'instanceColor';
const amount = 8;
const instanceCount = Math.pow( amount, 3 );
let camera;
let scene;
let renderer;
let mesh;
let renderLoop;

const main = container => {
    init(container);
}

const init = container => {

    // disable anti-aliasing to improve frame rate
    renderer = new THREE.WebGLRenderer( { antialias: false } );

    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.outputEncoding = THREE.sRGBEncoding;

    container.appendChild( renderer.domElement );

    window.addEventListener( 'resize', onWindowResize, false );

    (async () => {

        // load geometry
        const geometry = await new Promise(resolve => new THREE.BufferGeometryLoader().load('../models/json/suzanne_buffergeometry.json', resolve));
        geometry.setAttribute(instanceColorString, getInstancedBufferColorAttribute(instanceCount) );
        geometry.computeVertexNormals();
        const scaleFactor = 0.5;
        geometry.scale( scaleFactor, scaleFactor, scaleFactor );

        const texture = await new Promise(resolve => new THREE.TextureLoader().load('../textures/matcaps/matcap-porcelain-white.jpg', resolve));
        texture.encoding = THREE.sRGBEncoding;

        const material = getMaterialWithInstanceColorString(instanceColorString, texture)

        mesh = new THREE.InstancedMesh(geometry, material, instanceCount);
        layoutInstances(mesh, amount);

        camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 100 );
        camera.position.set( 0, 0, 20 );

        scene = new THREE.Scene();
        scene.add( mesh );

        renderLoop = () => {

            const time = Date.now() * 0.001;
            mesh.rotation.x = Math.sin( time / 4 );
            mesh.rotation.y = Math.sin( time / 2 );

            renderer.render(scene, camera);
        }

        animate();

    })();

}

const animate = () => {
    requestAnimationFrame( animate );
    renderLoop();
}

const layoutInstances = (mesh, amount) => {

    const proxy = new THREE.Object3D();

    let i = 0;
    const offset = (amount - 1)/2;

    for (let x = 0; x < amount; x++) {
        for (let y = 0; y < amount; y++) {
            for (let z = 0; z < amount; z++) {
                proxy.position.set(offset - x, offset - y, offset - z);
                proxy.updateMatrix();
                mesh.setMatrixAt(i++, proxy.matrix);
            }
        }
    }
}

const getInstancedBufferColorAttribute = instanceCount => {

    const rgb = [];
    for (let i = 0; i < instanceCount; i++) {
        rgb.push( Math.random() );
        rgb.push( Math.random() );
        rgb.push( Math.random() );
    }

    return new THREE.InstancedBufferAttribute(new Float32Array(rgb), 3);

}

const getMaterialWithInstanceColorString = (str, texture) => {

    // const material = new THREE.MeshMatcapMaterial( { color: 0xaaaaff, matcap: texture } );
    const material = new THREE.MeshMatcapMaterial( { matcap: texture } );

    material.onBeforeCompile = shader => {

        const colorParsChunk =
            [
                `attribute vec3 ${ str };`,
                `varying vec3 v_${ str };`,
                '#include <common>'
            ].join( '\n' );

        const instanceColorChunk =
            [
                '#include <begin_vertex>',
                `v_${ str } = ${ str };`
            ].join( '\n' );

        shader.vertexShader = shader.vertexShader
            .replace( '#include <common>', colorParsChunk )
            .replace( '#include <begin_vertex>', instanceColorChunk );

        const fragmentParsChunk =
            [
                `varying vec3 v_${ str };`,
                '#include <common>'
            ].join( '\n' );

        const colorChunk =
            [
                `vec4 diffuseColor = vec4( diffuse * v_${ str }, opacity );`
            ].join( '\n' );

        shader.fragmentShader = shader.fragmentShader
            .replace( '#include <common>', fragmentParsChunk )
            .replace( 'vec4 diffuseColor = vec4( diffuse, opacity );', colorChunk );

    };

    return material;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

export { main }
