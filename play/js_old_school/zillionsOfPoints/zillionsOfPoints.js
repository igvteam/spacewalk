import * as THREE from '../es6/three.module.js';
import OrbitControls from '../../../js/threejs_es6/orbit-controls-es6.js';
import { appleCrayonColorThreeJS } from '../../../js/color.js';

let scene;
let renderer;
let camera;
let orbitControl;

let main = (threejs_canvas_container) => {

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    threejs_canvas_container.appendChild( renderer.domElement );

    const [ fov, near, far ] = [ 27, 5, 8e3 ];
    camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, near, far);
    camera.position.z = 2750;

    orbitControl = new OrbitControls(camera, renderer.domElement);
    orbitControl.screenSpacePanning = false;
    orbitControl.target = new THREE.Vector3(0,0,0);
    orbitControl.update();

    scene = new THREE.Scene();
    scene.background = appleCrayonColorThreeJS('nickel');

    setup(scene, renderer, camera, orbitControl);

    animate();

};

let setup = (scene, renderer, camera, orbitControl) => {

    const geometry = new THREE.BufferGeometry();
    const xyz = [];
    const rgb = [];

    const _c = new THREE.Color();
    const n = 1e3;

    const particles = 7.5e5;
    for ( let i = 0; i < particles; i++ ) {

        const x = n * (Math.random() - 0.5);
        const y = n * (Math.random() - 0.5);
        const z = n * (Math.random() - 0.5);
        xyz.push( x, y, z );

        const vx = ( x / n ) + 0.5;
        const vy = ( y / n ) + 0.5;
        const vz = ( z / n ) + 0.5;
        _c.setRGB( vx, vy, vz );

        const { r, g, b } = _c;
        rgb.push(r, g, b);
    }

    geometry.addAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
    geometry.addAttribute(   'color', new THREE.Float32BufferAttribute(rgb, 3));
    geometry.computeBoundingSphere();

    const pointSize = 8;
    const material = new THREE.PointsMaterial( { size: pointSize, vertexColors: THREE.VertexColors } );

    const points = new THREE.Points(geometry, material);

    scene.add( points );

    window.addEventListener('resize', onWindowResize, false );

};

let onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
};

let animate = () => {
    requestAnimationFrame( animate );
    renderer.render(scene, camera)
};

export { main };
