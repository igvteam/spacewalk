import * as THREE from '../../js/threejs_es6/three.module.js';
import OrbitControls from '../../js/threejs_es6/orbit-controls-es6.js';

import { appleCrayonNames, appleCrayonColorHexValue } from '../../js/ei_color.js';

let scene;
let renderer;
let camera;
let orbitControl;

let main = (threejs_canvas) => {

    renderer = new THREE.WebGLRenderer({ canvas: threejs_canvas, antialias: true });
    renderer.setClearColor(appleCrayonColorHexValue('snow'));
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    const [ near, far, fov ] = [ 1e-1, 1e4, 40 ];
    camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, near, far);
    orbitControl = new OrbitControls(camera, renderer.domElement);
    scene = new THREE.Scene();

    setup(scene, renderer, camera, orbitControl);
};

let setup = async (scene, renderer, camera, orbitControl) => {

    const [ targetX, targetY, targetZ ] = [ 0, 0, 0 ];
    const target = new THREE.Vector3(targetX, targetY, targetZ);

    const dimen = 16;
    const [ cameraPositionX, cameraPositionY, cameraPositionZ ] = [ dimen, dimen, 2*dimen ];

    camera.position.set(cameraPositionX, cameraPositionY, cameraPositionZ);
    camera.lookAt( target );

    orbitControl.screenSpacePanning = false;
    orbitControl.target = target;
    orbitControl.update();
    orbitControl.addEventListener("change", () => renderer.render(scene, camera));

    let geometry;

    // sphere geometry
    // geometry = new THREE.SphereBufferGeometry( dimen / 2, 32, 16 );
    // geometry = geometry.toNonIndexed();

    // box geometry
    geometry = new THREE.BoxBufferGeometry(dimen, dimen, dimen);
    geometry = geometry.toNonIndexed();

    // material - custom shader
    const materialConfig =
        {
            uniforms: {},
              vertexShader: document.getElementById( 'show_st_vert' ).textContent,
            fragmentShader: document.getElementById( 'show_st_frag' ).textContent,
        };

    let material = new THREE.ShaderMaterial( materialConfig );
    material.extensions.derivatives = true;

    let mesh = new THREE.Mesh(geometry, material);

    scene.add( mesh );

    window.addEventListener( 'resize', onWindowResize, false );

    renderer.render( scene, camera );

};

let onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.render( scene, camera );
};

export { main };
