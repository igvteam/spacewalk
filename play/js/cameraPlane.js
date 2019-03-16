import * as THREE from '../../js/threejs_es6/three.module.js';
import OrbitControls from '../../js/threejs_es6/orbit-controls-es6.js';
import CubicMapManager from '../../js/cubicMapManager.js';
import { appleCrayonColorThreeJS, appleCrayonColorHexValue } from '../../js/color.js';
import { prettyMatrix4Print } from '../../js/math.js';

let scene;
let renderer;
let camera;
let orbitControl;
let diffuseCubicMapManager;

let showSTMaterial;

const [ near, far, fov ] = [ 1e-1, 7e2, 40 ];

let main = async(threejs_canvas) => {

    const showSTConfig =
        {
            uniforms: {},
            vertexShader: document.getElementById( 'show_st_vert' ).textContent,
            fragmentShader: document.getElementById( 'show_st_frag' ).textContent,
            side: THREE.DoubleSide
        };

    showSTMaterial = new THREE.ShaderMaterial( showSTConfig );

    renderer = new THREE.WebGLRenderer({ canvas: threejs_canvas, antialias: true });
    renderer.setClearColor(appleCrayonColorHexValue('snow'));
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, near, far);
    orbitControl = new OrbitControls(camera, renderer.domElement);
    scene = new THREE.Scene();


    const specularCubicMapMaterialConfig =
        {
            textureRoot: '../../texture/cubic/diagnostic/threejs_format/',
            suffix: '.png',
            isSpecularMap: true
        };

    const specularCubicMapManager = new CubicMapManager(specularCubicMapMaterialConfig);

    scene.background = appleCrayonColorThreeJS('magnesium');

    await setup(scene, renderer, camera, orbitControl);

    renderer.render( scene, camera );

};
let target;
let mesh;
let setup = async (scene, renderer, camera, orbitControl) => {

    const [ targetX, targetY, targetZ ] = [ 0, 0, 0 ];
    target = new THREE.Vector3(targetX, targetY, targetZ);

    const dimen = 16;

    let [ locationX, locationY, locationZ ] = [ dimen, dimen, dimen ];
    // [ locationX, locationY, locationZ ] = [ 2*dimen, 0, 2*dimen ];
    // [ locationX, locationY, locationZ ] = [ 0, 0, 3*dimen ];
    // [ locationX, locationY, locationZ ] = [ 3*dimen, 0, 0 ];

    camera.position.set(locationX, locationY, locationZ);
    camera.lookAt( target );

    orbitControl.screenSpacePanning = false;
    orbitControl.target = target;
    orbitControl.update();
    orbitControl.addEventListener("change", doRender);

    const groundPlane = new THREE.GridHelper(4 * dimen, 4 * dimen, appleCrayonColorHexValue('steel'), appleCrayonColorHexValue('steel'));
    groundPlane.position.set(targetX, targetY, targetZ);
    scene.add( groundPlane );

    const diffuseCubicMapMaterialConfig =
        {
            textureRoot: '../../texture/cubic/diagnostic/threejs_format/',
            suffix: '.png',
            vertexShaderName: 'diffuse_cube_vert',
            fragmentShaderName: 'diffuse_cube_frag',
            isSpecularMap: false
        };

    diffuseCubicMapManager = new CubicMapManager(diffuseCubicMapMaterialConfig);

    let sphereGeometry = new THREE.SphereBufferGeometry( dimen/2, 32, 16 );

    let planeGeometry = new THREE.PlaneBufferGeometry( 2, 2, 8, 8 );

    mesh = new THREE.Mesh(planeGeometry, showSTMaterial);
    mesh.matrixAutoUpdate = false;

    scene.add( mesh );

    window.addEventListener( 'resize', onWindowResize, false );

};

let matrix4Factory = new THREE.Matrix4();
matrix4Factory.identity();

let vector3factory = new THREE.Vector3();
vector3factory.set(0, 0, 0);

let doRender = () => {

    const distanceFromCamera = 0.9 * far;
    // const distanceFromCamera = camera.position.length();

    // Scale camera plane to fill viewing frustrum
    const dimension = distanceFromCamera * Math.tan( THREE.Math.degToRad( camera.fov/2 ) );
    const scale = matrix4Factory.clone().makeScale(camera.aspect * dimension, dimension, 1);
    // const scale = matrix4Factory.clone().makeScale(2, 2, 1);

    // 0 - Extract rotation
    const rotationOnly = matrix4Factory.clone().extractRotation(camera.matrixWorldInverse);

    // // 1 - Transpose
    let A = rotationOnly.clone().transpose();

    // // 2 - Translate rotated camera plane to camera origin
    const B = matrix4Factory.clone().makeTranslation(camera.position.x, camera.position.y, camera.position.z);

    // // 3 - Position camera plane by translating the distance "cameraNear" along camera look-at vector.
    const translation = vector3factory.clone().subVectors(target, camera.position).normalize().multiplyScalar(distanceFromCamera);
    const C = matrix4Factory.clone().makeTranslation(translation.x, translation.y, translation.z);

    // A * scale
    const AScale = scale.clone().premultiply(A);

    // B * A * scale
    const BAScale = AScale.clone().premultiply(B);

    // C * B * A * scale
    const CBAScale = BAScale.clone().premultiply(C);

    const cameraPlaneTransform = CBAScale.clone();

    // prettyMatrix4Print('scale', scale);

    // prettyMatrix4Print('A', A);
    // prettyMatrix4Print('B', B);
    // prettyMatrix4Print('C', C);

    // prettyMatrix4Print('AScale', AScale);
    // prettyMatrix4Print('BAScale', BAScale);
    // prettyMatrix4Print('CBAScale', CBAScale);
    // prettyMatrix4Print('CBAScale', CBAScale);

    // prettyMatrix4Print('camera - matrixWorld', camera.matrixWorld);
    // prettyMatrix4Print('matrixWorldInverse', camera.matrixWorldInverse);

    mesh.matrix.copy( cameraPlaneTransform );

    renderer.render(scene, camera);
};

let onWindowResize = () => {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

    doRender();
};

export { main };
