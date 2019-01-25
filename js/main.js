import * as THREE from './three.module.js';
import {rgb2hex, appleCrayonColor } from './ei_color.js';
let main = (threejs_canvas) => {

    let renderer = new THREE.WebGLRenderer({ canvas: threejs_canvas, antialias: true });

    // renderer.setClearColor(rgb2hex(255, 0, 0));
    renderer.setClearColor(appleCrayonColor('honeydew'));
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    let target = new THREE.Vector3(0, 0, -1000);

    let camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 3000);

    camera.position.set(300, 300, 700);
    camera.lookAt( target );

    let scene = new THREE.Scene();

    let ambient = new THREE.AmbientLight(rgb2hex(255, 255, 255), 0.5);
    scene.add(ambient);

    let pointLight = new THREE.PointLight(rgb2hex(255, 255, 255), 0.5);
    scene.add(pointLight);

    let dimen = 100;
    let geometry = new THREE.CubeGeometry(dimen, dimen/2, 2*dimen);
    let material = new THREE.MeshLambertMaterial({ color: appleCrayonColor('teal') });
    let mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(target.x, target.y, target.z);

    scene.add(mesh);

    let render = () => {
        // mesh.rotation.x += 0.01;
        mesh.rotation.y += 0.01;
        renderer.render(scene, camera);
        requestAnimationFrame(render);
    };

    requestAnimationFrame(render);


};

export { main };
