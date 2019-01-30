import * as THREE from './three.module.js';
import OrbitControls from './orbit-controls-es6.js';
import {rgb2hex, appleCrayonColor } from './ei_color.js';

let main = (threejs_canvas) => {

    let renderer = new THREE.WebGLRenderer({ canvas: threejs_canvas, antialias: true });
    renderer.setClearColor(appleCrayonColor('snow'));
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    const [ near, far, fov ] = [ 1e-1, 1e5, 35 ];
    let camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, near, far);
    let orbitControl = new OrbitControls(camera, renderer.domElement);
    let scene = new THREE.Scene();

    setup(scene, renderer, camera, orbitControl);
};

let setup = async (scene, renderer, camera, orbitControl) => {

    const response = await fetch('data/chr21/IMR90OneMolecule/000001.txt');
    const text = await response.text();

    const lines = text.split(/\r?\n/);

    let dev_null;

    // line 0 - bbox
    dev_null = lines.shift();
    const bbox = dev_null.split(' ');
    bbox.shift(); // discard 'bbox' keyword

    const [ minX, minY, minZ, maxX, maxY, maxZ ] = bbox.map((string) => { return parseFloat(string)});
    const [ targetX, targetY, targetZ ] = [ (maxX+minX)/2, (maxY+minY)/2, (maxZ+minZ)/2 ];
    const [ extentX, extentY, extentZ ] = [ maxX-minX, maxY-minY, maxZ-minZ ];

    const target = new THREE.Vector3(targetX, targetY, targetZ);

    let xyz_list = [];
    for(let line of lines) {

        let xyz = [];
        if ("" === line) {
            // ignore
        } else {
            xyz = line.split(' ').map((string) => { return 'nan' === string ? NaN : parseFloat(string); });
            xyz_list.push(xyz);
        }

    }

    // let dimen = 0.5 * Math.max(extentX, extentY, extentZ);
    // dimen = Math.sqrt(dimen*dimen + (2 * dimen*dimen));

    const [ cameraPositionX, cameraPositionY, cameraPositionZ ] = [ targetX - extentX, targetY + extentY, targetZ - extentZ ];
    camera.position.set(cameraPositionX, cameraPositionY, cameraPositionZ);
    camera.lookAt( target );

    orbitControl.screenSpacePanning = false;
    orbitControl.target = target;
    orbitControl.update();
    orbitControl.addEventListener("change", () => renderer.render(scene, camera));

    const groundPlane = new THREE.GridHelper( 2 * Math.max(extentX, extentY, extentZ), 16 );
    groundPlane.position.set(targetX, targetY, targetZ);

    scene.add( groundPlane );

    let ambient = new THREE.AmbientLight(rgb2hex(255, 255, 255), 0.5);
    scene.add(ambient);

    let pointLight = new THREE.PointLight(rgb2hex(255, 255, 255), 0.5);
    scene.add(pointLight);

    // spheres
    for (let position of xyz_list) {
        makeSphereWithCenter(position, 24, scene);
    }

    // cylinders
    for (let i = 0, j = 1; j < xyz_list.length; ++i, ++j) {
        makeCylinderWithEndPoints(xyz_list[ i ], xyz_list[ j ], scene);
    }

    let onWindowResize = () => {

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize( window.innerWidth, window.innerHeight );
        renderer.render( scene, camera );

    };

    window.addEventListener( 'resize', onWindowResize, false );

    renderer.render( scene, camera );

};

let makeSphereWithCenter = (center, radius, scene) => {

    const [ x, y, z ] = center;
    if (isNaN(x)) {
        return;
    }

    const material = new THREE.MeshNormalMaterial();
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), material);
    sphere.position.set(x, y, z);

    scene.add(sphere);
};

let makeCylinderWithEndPoints = (a, b, scene) => {

    const [ x0, y0, z0 ] = a;
    const [ x1, y1, z1 ] = b;
    if (isNaN(x0) || isNaN(x1)) {
        return;
    }

    const path = new THREE.CatmullRomCurve3([ new THREE.Vector3( x0, y0, z0 ), new THREE.Vector3( x1, y1, z1 ) ]);
    const material = new THREE.MeshNormalMaterial();

    scene.add(new THREE.Mesh(new THREE.TubeGeometry(path, 4, 12, 16, false), material));
};

export { main };
