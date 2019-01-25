import * as THREE from './three.module.js';
import OrbitControls from './orbit-controls-es6.js';
import {rgb2hex, appleCrayonColor } from './ei_color.js';

let main = (threejs_canvas) => {

    let renderer = new THREE.WebGLRenderer({ canvas: threejs_canvas, antialias: true });

    renderer.setClearColor(appleCrayonColor('honeydew'));
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    let camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 3000);

    let controls = new OrbitControls(camera, renderer.domElement);

    camera.position.set(300, 300, 700);
    let target = new THREE.Vector3(0, 0, -1000);
    camera.lookAt( target );

    // controls.update();
    controls.addEventListener("change", () => renderer.render(scene, camera));

    let scene = new THREE.Scene();
    scene.background = new THREE.Color(appleCrayonColor('snow'));

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

    // let animate = () => {
    //     requestAnimationFrame( animate );
    //     controls.update();
    //     renderer.render( scene, camera );
    // };
    //
    // animate();

    renderer.render( scene, camera );

};

export { main };
