import * as THREE from './three.module.js';
import {rgb2hex, appleCrayonColor } from './ei_color.js';
let main = (threejs_canvas) => {

    let renderer = new THREE.WebGLRenderer({ canvas: threejs_canvas, antialias: true });

    // renderer.setClearColor(rgb2hex(255, 0, 0));
    renderer.setClearColor(appleCrayonColor('honeydew'));
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    let camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 3000);

    let scene = new THREE.Scene();

    let ambient = new THREE.AmbientLight(rgb2hex(255, 255, 255), 0.5);
    scene.add(ambient);

    let pointLight = new THREE.PointLight(rgb2hex(255, 255, 255), 0.5);
    scene.add(pointLight);

    let geometry = new THREE.CubeGeometry(100, 100, 100);
    let material = new THREE.MeshLambertMaterial({ color: appleCrayonColor('teal') });
    let mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 0, -1000);

    scene.add(mesh);

    let render = () => {
        mesh.rotation.x += 0.01;
        mesh.rotation.y += 0.01;
        renderer.render(scene, camera);
        requestAnimationFrame(render);
    };

    requestAnimationFrame(render);


};

export { main };
