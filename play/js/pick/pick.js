import * as THREE from '../../../js/threejs/three.module.js';
import OrbitControls from '../../../js/threejs/orbit-controls-es6.js';

import Picker from '../../../js/picker.js';
import { throttle } from '../../../js/utils.js';
import { appleCrayonColorHexValue, appleCrayonRandomColorHexValue } from '../../../js/color.js';

let scene;
let renderer;
let camera;
let orbitControl;
let picker;

let main = (threejs_canvas_container) => {

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    renderer.setClearColor(appleCrayonColorHexValue('steel'));

    threejs_canvas_container.appendChild( renderer.domElement );

    const [ near, far, fov ] = [ 1e-1, 1e4, 70 ];
    camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, near, far);
    orbitControl = new OrbitControls(camera, renderer.domElement);
    orbitControl.zoomSpeed /= 4.0;

    const raycaster = new THREE.Raycaster();
    picker = new Picker({ raycaster });

    scene = new THREE.Scene();

    setup(threejs_canvas_container, scene, renderer, camera, orbitControl);

    animate();

};

let setup = (container, scene, renderer, camera, orbitControl) => {

    const [ targetX, targetY, targetZ ] = [ 0, 0, 0 ];
    const target = new THREE.Vector3(targetX, targetY, targetZ);

    const [ lightPositionX, lightPositionY, lightPositionZ ] = [ 1, 1, 1 ];
    const [ cameraPositionX, cameraPositionY, cameraPositionZ ] = [ 0, 0, 256 ];

    camera.position.set(cameraPositionX, cameraPositionY, cameraPositionZ);
    camera.lookAt( target );

    orbitControl.screenSpacePanning = false;
    orbitControl.target = target;
    orbitControl.update();

    let hemisphereLight = new THREE.HemisphereLight( appleCrayonColorHexValue('snow'), appleCrayonColorHexValue('cantaloupe'), .25 );
    scene.add( hemisphereLight );

    let directionalLight = new THREE.DirectionalLight( appleCrayonColorHexValue('snow'), .5 );
    directionalLight.position.set( lightPositionX, lightPositionY, lightPositionZ ).normalize();
    scene.add( directionalLight );

    let geometry = new THREE.BoxBufferGeometry( 20, 20, 20 );

    for (let i = 0; i < 2000; i++) {

        let mesh = new THREE.Mesh( geometry, new THREE.MeshLambertMaterial( { color: appleCrayonRandomColorHexValue() } ) );

        mesh.position.x = Math.random() * 800 - 400;
        mesh.position.y = Math.random() * 800 - 400;
        mesh.position.z = Math.random() * 800 - 400;

        mesh.rotation.x = Math.random() * 2 * Math.PI;
        mesh.rotation.y = Math.random() * 2 * Math.PI;
        mesh.rotation.z = Math.random() * 2 * Math.PI;

        mesh.scale.x = Math.random() + 0.5;
        mesh.scale.y = Math.random() + 0.5;
        mesh.scale.z = Math.random() + 0.5;

        scene.add( mesh );

    }

    window.addEventListener('resize', onWindowResize, false );

    container.addEventListener('mousemove', throttle(onWindowMouseMove, 20));

};

let onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
};

let onWindowMouseMove = (event) => {

    event.preventDefault();

    const x =  ( event.clientX / renderer.domElement.clientWidth  ) * 2 - 1;
    const y = -( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;
    picker.intersect({ x, y, scene, camera });
};

let animate = () => {
    requestAnimationFrame( animate );
    renderer.render(scene, camera)
};

export { main };
