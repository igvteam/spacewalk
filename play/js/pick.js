import * as THREE from '../../js/threejs_es6/three.module.js';
import OrbitControls from '../../js/threejs_es6/orbit-controls-es6.js';

import { appleCrayonNames, appleCrayonColorHexValue } from '../../js/ei_color.js';

let scene;
let renderer;
let camera;
let orbitControl;
let raycaster;
let mouse;

let main = (threejs_canvas) => {

    renderer = new THREE.WebGLRenderer({ canvas: threejs_canvas, antialias: true });
    renderer.setClearColor(appleCrayonColorHexValue('snow'));
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    const [ near, far, fov ] = [ 1e-1, 1e4, 40 ];
    camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, near, far);
    orbitControl = new OrbitControls(camera, renderer.domElement);

    mouse = new THREE.Vector2();
    raycaster = new THREE.Raycaster();

    scene = new THREE.Scene();

    setup(scene, renderer, camera, orbitControl);
};

let setup = async (scene, renderer, camera, orbitControl) => {

    const [ targetX, targetY, targetZ ] = [ 0, 0, 0 ];
    const target = new THREE.Vector3(targetX, targetY, targetZ);

    const [ cameraPositionX, cameraPositionY, cameraPositionZ ] = [64, 64, 64];

    camera.position.set(cameraPositionX, cameraPositionY, cameraPositionZ);
    camera.lookAt( target );

    orbitControl.screenSpacePanning = false;
    orbitControl.target = target;
    orbitControl.update();
    orbitControl.addEventListener("change", renderScene);




    let hemisphereLight = new THREE.HemisphereLight( appleCrayonColorHexValue('snow'), appleCrayonColorHexValue('salmon'), 1 );
    let directionalLight = new THREE.DirectionalLight( appleCrayonColorHexValue('snow'), 1 );
    directionalLight.position.set( cameraPositionX, cameraPositionY, cameraPositionZ ).normalize();
    scene.add( hemisphereLight );

    let dimen = 16;
    let boxGeometry = new THREE.BoxBufferGeometry( dimen, dimen, dimen );
    var boxMesh = new THREE.Mesh( boxGeometry, new THREE.MeshLambertMaterial( { color: appleCrayonColorHexValue('lime') } ) );

    scene.add( boxMesh );

    window.addEventListener( 'resize', onWindowResize, false );

    renderer.render( scene, camera );

};

let onWindowResize = () => {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
    renderScene();
};

let onWindowMouseMove = (event) => {

    event.preventDefault();

    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    renderScene();
};

let renderScene = () => {

    camera.updateMatrixWorld();

    raycaster.setFromCamera( mouse, camera );

    // intersect scene

    renderer.render(scene, camera)
};

export { main };
