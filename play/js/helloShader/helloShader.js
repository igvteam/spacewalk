import * as THREE from '../../../js/threejs_es6/three.module.js';
import OrbitControls from '../../../js/threejs_es6/orbit-controls-es6.js';
import CubicMapManager from '../../../js/cubicMapManager.js';
import { appleCrayonNames, appleCrayonColorHexValue } from '../../../js/color.js';

let scene;
let renderer;
let camera;
let orbitControl;
let diffuseCubicMapManager;
let specularCubicMapManager;

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

    const diffuseCubicMapMaterialConfig =
        {
            // textureRoot: '../../texture/cubic/diagnostic/threejs_format/',
            textureRoot: '../../texture/cubic/specular/aerodynamics_workshop/',
            suffix: '.png',
            vertexShaderName: 'diffuse_cube_vert',
            fragmentShaderName: 'diffuse_cube_frag',
            isSpecularMap: false
        };

    diffuseCubicMapManager = new CubicMapManager(diffuseCubicMapMaterialConfig);

    const specularCubicMapMaterialConfig =
        {
            // textureRoot: '../../texture/cubic/diagnostic/threejs_format/',
            textureRoot: '../../texture/cubic/specular/aerodynamics_workshop/',
            suffix: '.png',
            isSpecularMap: true
        };

    specularCubicMapManager = new CubicMapManager(specularCubicMapMaterialConfig);

    scene.background = specularCubicMapManager.cubicTexture;
    // scene.background = new THREE.TextureLoader().load( "../../texture/uv.png" );
    // scene.background = appleCrayonColorThreeJS('iron');

    await setup(scene, renderer, camera, orbitControl);

    renderer.render( scene, camera );

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

    // const groundPlane = new THREE.GridHelper(4 * dimen, 4 * dimen, appleCrayonColorHexValue('steel'), appleCrayonColorHexValue('steel'));
    // groundPlane.position.set(targetX, targetY, targetZ);
    // scene.add( groundPlane );

    let [ rX, rY, rZ ] = [ new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4() ];

    const thetaX = Math.PI/2;
    rX.makeRotationX( thetaX );

    const thetaY = Math.PI/6;
    rY.makeRotationY( thetaY );

    const thetaZ = Math.PI/3;
    rZ.makeRotationZ( thetaZ );


    let geometry;

    // sphere geometry
    geometry = new THREE.SphereBufferGeometry( dimen/2, 32, 16 );
    geometry = geometry.toNonIndexed();

    // box geometry
    // geometry = new THREE.BoxBufferGeometry(dimen, dimen, dimen);
    // geometry = geometry.toNonIndexed();


    let meshA = new THREE.Mesh(geometry, diffuseCubicMapManager.material);
    // let meshA = new THREE.Mesh(geometry, showSTMaterial);
    meshA.position.set(dimen, 0, 0);
    scene.add( meshA );

    let meshB = new THREE.Mesh(geometry, diffuseCubicMapManager.material);
    // let meshB = new THREE.Mesh(geometry, showSTMaterial);
    meshB.position.set(-dimen, 0, 0);
    scene.add( meshB );

    // let cylinderMesh = createCylinderMesh(diffuseCubicMapManager.material, 2 * dimen, dimen / 8);
    let cylinderMesh = createCylinderMesh(showSTMaterial, 2 * dimen, dimen / 8);
    scene.add(cylinderMesh);

    window.addEventListener( 'resize', onWindowResize, false );

};

let createCylinderMesh = (material, halfLength, radius) => {

    const [ x0, y0, z0 ] = [ -halfLength, 0, 0 ];
    const [ x1, y1, z1 ] = [  halfLength, 0, 0 ];
    const axis = new THREE.CatmullRomCurve3([ new THREE.Vector3( x0, y0, z0 ), new THREE.Vector3( x1, y1, z1 ) ]);

    return new THREE.Mesh(new THREE.TubeGeometry(axis, 4, radius, 16, false), material);
};

let onWindowResize = () => {

    showScreenCoordinatesUniforms.uXYPixel.value.x = window.innerWidth;
    showScreenCoordinatesUniforms.uXYPixel.value.y = window.innerHeight;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.render( scene, camera );

};

export { main };
