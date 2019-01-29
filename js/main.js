import * as THREE from './three.module.js';
import OrbitControls from './orbit-controls-es6.js';
import {rgb2hex, appleCrayonColor } from './ei_color.js';

let main = (threejs_canvas) => {

    let renderer = new THREE.WebGLRenderer({ canvas: threejs_canvas, antialias: true });
    renderer.setClearColor(appleCrayonColor('honeydew'));
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    const [ near, far, fov ] = [ 1e-1, 1e4, 35 ];
    let camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, near, far);
    let orbitControl = new OrbitControls(camera, renderer.domElement);
    let scene = new THREE.Scene();

    setup(scene, renderer, camera, orbitControl, new THREE.Vector3(0,0,0));
};

let setup = async (scene, renderer, camera, orbitControl, target) => {

    const response = await fetch('data/chr21/onemolecule/000001.txt');
    const text = await response.text();

    const lines = text.split(/\r?\n/);

    let bbox = lines.shift();
    const pieces = bbox.split(' ');
    const dev_null = pieces.shift();

    const [minX, minY, minZ, maxX, maxY, maxZ] = pieces.map((string) => { return parseInt(string, 10)});
    console.log(minX, minY, minZ, maxX, maxY, maxZ);

    let xyz_list = [];
    for(let line of lines) {
        let xyz = line.split(' ').map((string) => {
            if ('NaN' === string) {
                return NaN;
            } else {
                return parseFloat(string);
            }
        });

        console.log(xyz[0], xyz[1], xyz[2]);
        xyz_list.push(xyz);
    }

    camera.position.set(300, 300, 700);
    camera.lookAt( target );

    orbitControl.screenSpacePanning = false;
    orbitControl.target = target;
    orbitControl.update();
    orbitControl.addEventListener("change", () => renderer.render(scene, camera));


    // scene.background = new THREE.Color(appleCrayonColor('snow'));
    scene.add( new THREE.GridHelper( 2 * Math.max(maxX, maxY, maxZ), 16 ) );

    let ambient = new THREE.AmbientLight(rgb2hex(255, 255, 255), 0.5);
    scene.add(ambient);

    let pointLight = new THREE.PointLight(rgb2hex(255, 255, 255), 0.5);
    scene.add(pointLight);

    let group = new THREE.Group();

    const dimen = 128;
    // let geometry = new THREE.TorusKnotBufferGeometry( dimen, dimen/4, 128, 64 );
    let geometry = new THREE.CubeGeometry(dimen, dimen/2, 2*dimen);

    let material = new THREE.MeshNormalMaterial();
    // let material = new THREE.MeshPhongMaterial( { map: map, side: THREE.DoubleSide } );

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
