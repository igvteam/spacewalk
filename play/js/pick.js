import * as THREE from '../../js/threejs_es6/three.module.js';
import OrbitControls from '../../js/threejs_es6/orbit-controls-es6.js';

import { appleCrayonNames, appleCrayonColorHexValue, appleCrayonRandomColorHexValue } from '../../js/ei_color.js';

let scene;
let renderer;
let camera;
let orbitControl;
let raycaster;
let mouse;
let intersectedObject;

let main = (threejs_canvas) => {

    renderer = new THREE.WebGLRenderer({ canvas: threejs_canvas, antialias: true });
    renderer.setClearColor(appleCrayonColorHexValue('steel'));
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    const [ near, far, fov ] = [ 1e-1, 1e4, 70 ];
    camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, near, far);
    orbitControl = new OrbitControls(camera, renderer.domElement);
    orbitControl.zoomSpeed /= 4.0;

    mouse = new THREE.Vector2();
    raycaster = new THREE.Raycaster();

    scene = new THREE.Scene();

    setup(scene, renderer, camera, orbitControl);
};

let setup = async (scene, renderer, camera, orbitControl) => {

    const [ targetX, targetY, targetZ ] = [ 0, 0, 0 ];
    const target = new THREE.Vector3(targetX, targetY, targetZ);

    const [ lightPositionX, lightPositionY, lightPositionZ ] = [ 1, 1, 1 ];
    const [ cameraPositionX, cameraPositionY, cameraPositionZ ] = [ 0, 0, 256 ];

    camera.position.set(cameraPositionX, cameraPositionY, cameraPositionZ);
    camera.lookAt( target );

    orbitControl.screenSpacePanning = false;
    orbitControl.target = target;
    orbitControl.update();
    orbitControl.addEventListener("change", renderScene);


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

    window.addEventListener( 'resize', onWindowResize, false );

    window.addEventListener( 'mousemove', onWindowMouseMove, false );

    renderScene();

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

    // camera.updateMatrixWorld();


    // intersect scene
    intersectScene();

    renderer.render(scene, camera)
};

let intersectScene = () => {

    raycaster.setFromCamera( mouse, camera );

    let intersectionList = raycaster.intersectObjects( scene.children );

    if ( intersectionList.length > 0 ) {

        if ( intersectedObject !== intersectionList[ 0 ].object ) {

            if ( intersectedObject ) {
                intersectedObject.material.emissive.setHex( intersectedObject.currentHex );
            }

            intersectedObject = intersectionList[ 0 ].object;
            intersectedObject.currentHex = intersectedObject.material.emissive.getHex();
            intersectedObject.material.emissive.setHex( appleCrayonColorHexValue('strawberry') );

        }

    } else {

        if ( intersectedObject ) {
            intersectedObject.material.emissive.setHex( intersectedObject.currentHex );
        }
        intersectedObject = null;
    }

};


export { main };
