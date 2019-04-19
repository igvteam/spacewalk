import * as THREE from '../../../js/threejs_es6/three.module.js';
import OrbitControls from '../../../js/threejs_es6/orbit-controls-es6.js';

import { appleCrayonNames, appleCrayonColorHexValue } from '../../../js/color.js';

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

    const [ cameraPositionX, cameraPositionY, cameraPositionZ ] = [64, 64, 64];

    camera.position.set(cameraPositionX, cameraPositionY, cameraPositionZ);
    camera.lookAt( target );

    orbitControl.screenSpacePanning = false;
    orbitControl.target = target;
    orbitControl.update();
    orbitControl.addEventListener("change", () => renderer.render(scene, camera));

    let dimen = 8;

    let vertices;
    let colors;
    let geometry;

    //
    vertices =
        [
            new THREE.Vector3(-dimen, 0, dimen),
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(dimen, 0, -dimen)
        ];

    colors =
        [
            new THREE.Color( appleCrayonColorHexValue('maraschino') ),
            new THREE.Color( appleCrayonColorHexValue('lime') ),
            new THREE.Color( appleCrayonColorHexValue('blueberry') )
        ];
    geometry = new THREE.Geometry();
    geometry.vertices = vertices;
    geometry.colors = colors;
    scene.add( new THREE.Line( geometry, new THREE.LineBasicMaterial( { color: 0xffffff, vertexColors: THREE.VertexColors } ) ) );

    //
    vertices =
        [
            new THREE.Vector3(-dimen, 0, -dimen),
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(dimen, 0, dimen)
        ];

    colors =
        [
            new THREE.Color( appleCrayonColorHexValue('maraschino') ),
            new THREE.Color( appleCrayonColorHexValue('lime') ),
            new THREE.Color( appleCrayonColorHexValue('blueberry') )
        ];
    geometry = new THREE.Geometry();
    geometry.vertices = vertices;
    geometry.colors = colors;
    scene.add( new THREE.Line( geometry, new THREE.LineBasicMaterial( { color: 0xffffff, vertexColors: THREE.VertexColors } ) ) );

    /*
    let [ positions, colors ] = [ [], [] ];
    let points = hilbert3D( new THREE.Vector3( 0, 0, 0 ), 20.0, 1, 0, 1, 2, 3, 4, 5, 6, 7 );
    let spline = new THREE.CatmullRomCurve3( points );
    let divisions = Math.round( 12 * points.length );

    let color = new THREE.Color();
    for (let i = 0, howmany = divisions; i < howmany; i++ ) {

        let point = spline.getPoint( i / howmany );
        positions.push( point.x, point.y, point.z );

        color.setHSL( i / howmany, 1.0, 0.5 );
        colors.push( color.r, color.g, color.b );
    }

    let geometry = new LineGeometry();
    geometry.setPositions( positions );
    geometry.setColors( colors );

    let material = new FatLineMaterial( { color: 0xffffff, linewidth: 5, vertexColors: THREE.VertexColors, dashed: false } );

    let line = new Line2( geometry, material );
    line.computeLineDistances();
    line.scale.set( 1, 1, 1 );
    scene.add( line );
    */


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
