import * as THREE from '../../js/threejs_es6/three.module.js';
import OrbitControls from '../../js/threejs_es6/orbit-controls-es6.js';
import CubicMapManager from '../../js/cubicMapManager.js';
import { appleCrayonNames, appleCrayonColorHexValue } from '../../js/ei_color.js';

let scene;
let renderer;
let camera;
let orbitControl;

let main = (threejs_canvas) => {

    renderer = new THREE.WebGLRenderer({ canvas: threejs_canvas, antialias: true });
    renderer.setClearColor(appleCrayonColorHexValue('snow'));
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    const [ near, far, fov ] = [ 1e-1, 1e4, 40 ];
    camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, near, far);
    orbitControl = new OrbitControls(camera, renderer.domElement);
    scene = new THREE.Scene();

    setup(scene, renderer, camera, orbitControl);
};

let setup = async (scene, renderer, camera, orbitControl) => {

    const [ targetX, targetY, targetZ ] = [ 0, 0, 0 ];
    const target = new THREE.Vector3(targetX, targetY, targetZ);

    const dimen = 16;
    const [ cameraPositionX, cameraPositionY, cameraPositionZ ] = [ 1.5*dimen, 3*dimen, 3*dimen ];

    camera.position.set(cameraPositionX, cameraPositionY, cameraPositionZ);
    camera.lookAt( target );

    orbitControl.screenSpacePanning = false;
    orbitControl.target = target;
    orbitControl.update();
    orbitControl.addEventListener("change", () => renderer.render(scene, camera));

    const groundPlane = new THREE.GridHelper(4 * dimen, 4 * dimen, appleCrayonColorHexValue('steel'), appleCrayonColorHexValue('steel'));
    groundPlane.position.set(targetX, targetY, targetZ);
    scene.add( groundPlane );

    let geometry;

    // sphere geometry
    geometry = new THREE.SphereBufferGeometry( dimen / 2, 32, 16 );
    geometry = geometry.toNonIndexed();

    // box geometry
    // geometry = new THREE.BoxBufferGeometry(dimen, dimen, dimen);
    // geometry = geometry.toNonIndexed();

    let material;

    // material
    const materialConfig =
        {
            uniforms: {},
              vertexShader: document.getElementById( 'show_normal_vert' ).textContent,
            fragmentShader: document.getElementById( 'show_normal_frag' ).textContent,
        };

    // material = new THREE.ShaderMaterial( materialConfig );

    const cubicMapMaterialConfig =
        {
            textureRoot: '../../texture/cubic/Bridge/',
            suffix: '.jpg',
            vertexShaderName: 'diffuse_cube_vert',
            fragmentShaderName: 'diffuse_cube_frag'
        };

    const cubicMapManager = new CubicMapManager(cubicMapMaterialConfig);

    const mesh = new THREE.Mesh(geometry, cubicMapManager.material);

    let [ rX, rY, rZ ] = [ new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4() ];

    const thetaX = Math.PI/2;
    rX.makeRotationX( thetaX );

    const thetaY = Math.PI/6;
    rY.makeRotationY( thetaY );

    const thetaZ = Math.PI/3;
    rZ.makeRotationZ( thetaZ );

    let m4x4;

    m4x4 = mesh.matrixWorld;
    mesh.geometry.applyMatrix( rZ );
    m4x4 = mesh.matrixWorld;


    scene.add( mesh );

    window.addEventListener( 'resize', onWindowResize, false );

    renderer.render( scene, camera );

};

let onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.render( scene, camera );
};

export { main };
