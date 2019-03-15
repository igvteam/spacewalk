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

    const [ near, far, fov ] = [ 1e-1, 1e4, 40 ];
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

let setup = async (scene, renderer, camera, orbitControl) => {

    const [ targetX, targetY, targetZ ] = [ 0, 0, 0 ];
    const target = new THREE.Vector3(targetX, targetY, targetZ);

    const dimen = 16;
    // const [ cameraPositionX, cameraPositionY, cameraPositionZ ] = [ 1.5*dimen, 3*dimen, 3*dimen ];
    const [ cameraPositionX, cameraPositionY, cameraPositionZ ] = [ 2*dimen, 0, 2*dimen ];
    // const [ cameraPositionX, cameraPositionY, cameraPositionZ ] = [ 0, 0, 3*dimen ];

    camera.position.set(cameraPositionX, cameraPositionY, cameraPositionZ);
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

    let meshA = new THREE.Mesh(planeGeometry, showSTMaterial);
    scene.add( meshA );

    window.addEventListener( 'resize', onWindowResize, false );

};

let onWindowResize = () => {

    showScreenCoordinatesUniforms.uXYPixel.value.x = window.innerWidth;
    showScreenCoordinatesUniforms.uXYPixel.value.y = window.innerHeight;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    prettyMatrix4Print('camera - matrixWorld', camera.matrixWorld);
    prettyMatrix4Print('camera - matrixWorldInverse', camera.matrixWorldInverse);

    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.render( scene, camera );

};

export { main };
