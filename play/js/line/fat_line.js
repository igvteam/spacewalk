import * as THREE from '../../../js/threejs_es6/three.module.js';
import OrbitControls from '../../../js/threejs_es6/orbit-controls-es6.js';
import hilbert3D from '../../../js/threejs_es6/hilbert3D.js';

import FatLineGeometry from "../../../js/threejs_es6/fatlines/fatLineGeometry.js";
import FatLineMaterial from "../../../js/threejs_es6/fatlines/fatLineMaterial.js";
import FatLine from "../../../js/threejs_es6/fatlines/fatLine.js";

import { appleCrayonNames, appleCrayonColorHexValue } from '../../../js/color.js';

let scene;
let renderer;
let camera;
let orbitControl;
let lineMaterial;
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

    animate();


};

let setup = async (scene, renderer, camera, orbitControl) => {

    const [ targetX, targetY, targetZ ] = [ 0, 0, 0 ];
    const target = new THREE.Vector3(targetX, targetY, targetZ);

    const [ cameraPositionX, cameraPositionY, cameraPositionZ ] = [64, 64, 64];

    camera.position.set(cameraPositionX, cameraPositionY, cameraPositionZ);
    camera.lookAt( target );

    orbitControl.screenSpacePanning = false;
    orbitControl.target = target;
    orbitControl.update();

    const [ positions, colors ] = [ [], [] ];

    const points = hilbert3D( new THREE.Vector3( 0, 0, 0 ), 20.0, 1, 0, 1, 2, 3, 4, 5, 6, 7 );
    const spline = new THREE.CatmullRomCurve3( points );
    const divisions = Math.round( 12 * points.length );
    let color = new THREE.Color();

    for ( var i = 0, l = divisions; i < l; i ++ ) {

        var point = spline.getPoint( i / l );
        positions.push( point.x, point.y, point.z );

        color.setHSL( i / l, 1.0, 0.5 );
        colors.push( color.r, color.g, color.b );

    }

    // geometry
    let geometry = new FatLineGeometry();
    geometry.setPositions( positions );
    geometry.setColors( colors );

    // material
    const lineMaterialConfig =
        {
            linewidth: 5, // pixels
            vertexColors: THREE.VertexColors,
        };

    lineMaterial = new FatLineMaterial(lineMaterialConfig);

    // line object
    let line = new FatLine(geometry, lineMaterial);
    line.computeLineDistances();
    line.scale.set( 1, 1, 1 );
    scene.add( line );

    window.addEventListener( 'resize', onWindowResize, false );

    renderer.render( scene, camera );

};

let animate = () => {
    requestAnimationFrame( animate );

    // renderer will set this eventually
    lineMaterial.resolution.set( window.innerWidth, window.innerHeight ); // resolution of the viewport

    renderer.render(scene, camera)
};

let onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
};

export { main };
