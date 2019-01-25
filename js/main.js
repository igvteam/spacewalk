import * as THREE from './three.module.js';
import OrbitControls from './orbit-controls-es6.js';
import {rgb2hex, appleCrayonColor } from './ei_color.js';

let main = (threejs_canvas) => {

    let renderer = new THREE.WebGLRenderer({ canvas: threejs_canvas, antialias: true });

    renderer.setClearColor(appleCrayonColor('honeydew'));
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // const target = new THREE.Vector3(0, 0, -1000);
    const target = new THREE.Vector3(0,0,0);

    const near = 1e-1;
    const far = 1e4;
    let camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, near, far);
    camera.position.set(300, 300, 700);
    camera.lookAt( target );

    let orbitControl = new OrbitControls(camera, renderer.domElement);
    orbitControl.screenSpacePanning = false;
    orbitControl.target = target;
    orbitControl.update();
    orbitControl.addEventListener("change", () => renderer.render(scene, camera));

    let scene = new THREE.Scene();
    // scene.background = new THREE.Color(appleCrayonColor('snow'));
    scene.add( new THREE.GridHelper( 1000, 10 ) );

    let ambient = new THREE.AmbientLight(rgb2hex(255, 255, 255), 0.5);
    scene.add(ambient);

    let pointLight = new THREE.PointLight(rgb2hex(255, 255, 255), 0.5);
    scene.add(pointLight);


    const dimen = 150;
    let geometry = new THREE.CubeGeometry(dimen, dimen/2, 2*dimen);
    let material = new THREE.MeshNormalMaterial();
    let mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(target.x, target.y, target.z);
    scene.add(mesh);

    let onWindowResize = () => {

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize( window.innerWidth, window.innerHeight );
        renderer.render( scene, camera );

    };

    window.addEventListener( 'resize', onWindowResize, false );

    renderer.render( scene, camera );
};

export { main };
