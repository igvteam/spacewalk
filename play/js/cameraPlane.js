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

let showScreenCoordinatesMaterial;

let showSTMaterial;

let showScreenCoordinatesUniforms =
    {
        uXYPixel: new THREE.Uniform(new THREE.Vector2())
    };

const [ near, far, fov ] = [ 1e-1, 1e4, 40 ];

let main = async(threejs_canvas) => {

    const showSTConfig =
        {
            uniforms: {},
            vertexShader: document.getElementById( 'show_st_vert' ).textContent,
            fragmentShader: document.getElementById( 'show_st_frag' ).textContent,
            side: THREE.DoubleSide
        };

    showSTMaterial = new THREE.ShaderMaterial( showSTConfig );

    showScreenCoordinatesUniforms.uXYPixel.value.x = window.innerWidth;
    showScreenCoordinatesUniforms.uXYPixel.value.y = window.innerHeight;

    let showScreenCoordinatesConfig =
        {
            uniforms: showScreenCoordinatesUniforms,
            vertexShader:   document.getElementById( 'show_screen_coordinates_vert' ).textContent,
            fragmentShader: document.getElementById( 'show_screen_coordinates_frag' ).textContent,
            side: THREE.DoubleSide
        };

    showScreenCoordinatesMaterial = new THREE.ShaderMaterial(showScreenCoordinatesConfig);

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

let location;
let [ locationX, locationY, locationZ ] = [ 0, 0, 0 ];
let target;
let mesh;
let setup = async (scene, renderer, camera, orbitControl) => {

    const [ targetX, targetY, targetZ ] = [ 0, 0, 0 ];
    target = new THREE.Vector3(targetX, targetY, targetZ);

    const dimen = 16;
    [ locationX, locationY, locationZ ] = [ 2*dimen, 0, 2*dimen ];
    // [ locationX, locationY, locationZ ] = [ 0, 0, 3*dimen ];
    // [ locationX, locationY, locationZ ] = [ 3*dimen, 0, 0 ];
    location = new THREE.Vector3(locationX, locationY, locationZ);

    camera.position.set(locationX, locationY, locationZ);
    camera.lookAt( target );

    orbitControl.screenSpacePanning = false;
    orbitControl.target = target;
    orbitControl.update();
    orbitControl.addEventListener("change", () => renderer.render(scene, camera));

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

    let planeGeometry = new THREE.PlaneBufferGeometry( dimen, dimen, 8, 8 );

    mesh = new THREE.Mesh(planeGeometry, showSTMaterial);
    mesh.matrixAutoUpdate = false;

    scene.add( mesh );

    window.addEventListener( 'resize', onWindowResize, false );

};

let matrix4x4Factory = new THREE.Matrix4();
let vector3factory = new THREE.Vector3();
let onWindowResize = () => {

    showScreenCoordinatesUniforms.uXYPixel.value.x = window.innerWidth;
    showScreenCoordinatesUniforms.uXYPixel.value.y = window.innerHeight;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    // 0 - Extract rotation
    matrix4x4Factory.identity();
    const rotationOnly = matrix4x4Factory.extractRotation(camera.matrixWorldInverse).clone();

    // // 1 - Transpose
    let A = rotationOnly.clone();
    A.transpose();
    prettyMatrix4Print('A', A);

    // // 2 - Translate rotated camera plane to camera origin
    matrix4x4Factory.identity();
    const B = matrix4x4Factory.makeTranslation(locationX, locationY, locationZ).clone();
    prettyMatrix4Print('B', B);

    // // 3 - Position camera plane by translating the distance "cameraNear" along camera look-at vector.
    const distanceFromCamera = far / 2.0;

    vector3factory.set(0, 0, 0);
    const translation = vector3factory.subVectors(target, location).normalize().multiplyScalar(distanceFromCamera).clone();

    matrix4x4Factory.identity();
    const C = matrix4x4Factory.makeTranslation(translation.x, translation.y, translation.z).clone();
    prettyMatrix4Print('C', C);

    // // 4 - Concatenate
    const BA = A.premultiply(B).clone();
    prettyMatrix4Print('BA', BA);

    const CBA = BA.premultiply(C).clone();
    prettyMatrix4Print('CBA', CBA);

    const cameraPlaneTransform = CBA.clone();

    // prettyMatrix4Print('camera - matrixWorld', camera.matrixWorld);
    // prettyMatrix4Print('matrixWorldInverse', camera.matrixWorldInverse);
    // prettyMatrix4Print('rotationOnly(matrixWorldInverse)', rotationOnly);

    mesh.matrix.copy( cameraPlaneTransform );

    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.render( scene, camera );

};

export { main };
