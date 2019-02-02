import * as THREE from './threejs_es6/three.module.js';

import LineGeometry from './threejs_es6/LineGeometry.js';
import LineMaterial from './threejs_es6/LineMaterial.js';
import Line2        from './threejs_es6/Line2.js';

import OrbitControls from './threejs_es6/orbit-controls-es6.js';

import { appleCrayonNames, appleCrayonColor, appleCrayonThreeJSColor } from './ei_color.js';
import SequenceManager from './sequenceManager.js';

let scene;
let renderer;
let camera;
let orbitControl;
let xyz_list;
let main = (threejs_canvas) => {

    renderer = new THREE.WebGLRenderer({ canvas: threejs_canvas, antialias: true });
    renderer.setClearColor(appleCrayonColor('iron'));
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    const [ near, far, fov ] = [ 1e-1, 1e5, 35 ];
    camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, near, far);
    orbitControl = new OrbitControls(camera, renderer.domElement);

    scene = new THREE.Scene();
    scene.background = appleCrayonThreeJSColor('iron');

    setup(scene, renderer, camera, orbitControl);
};

let setup = async (scene, renderer, camera, orbitControl) => {

    const path = 'data/csv/IMR90_chr21-28-30Mb.csv';
    const response = await fetch(path);
    const text = await response.text();

    const lines = text.split(/\r?\n/);

    // discard blurb
    lines.shift();

    // discard column titles
    lines.shift();

    // chr index | segment index | Z | X | y
    let [ chr_index_current, chr_index ] = [ undefined, undefined ];
    let segments = {};

    // const reversed = lines.reverse();
    for (let line of lines) {

        if ("" === line) {
            // do nothing
            console.log('ignore blank line');
        } else {

            let parts = line.split(',');

            let index = parseInt(parts[ 0 ], 10) - 1;

            chr_index = index.toString();

            if (undefined === chr_index_current || chr_index_current !== chr_index) {
                chr_index_current = chr_index;

                segments[ chr_index_current ] = { xyz:[] };
            }

            // discard chr index
            parts.shift();

            // discard segment index
            parts.shift();

            let [ z, x, y ] = parts.map((token) => { return 'nan' === token ? NaN : parseFloat(token); });
            segments[ chr_index_current ].xyz.push([ x, y, z ]);

        }

    }

    let dev_null;

    let keys = Object.keys(segments);

    // diagnostics
    // let [ first_key, last_key ] = [ keys[ 0 ],             keys[ (keys.length - 1) ]];
    // let [ first,     last     ] = [ segments[ first_key ], segments[ last_key ]];


    for (let key of keys) {

        const list = segments[ key ].xyz;


        // min x
        dev_null = list
            .filter(( xyz ) => { return !isNaN(xyz[ 0 ]) && !isNaN(xyz[ 1 ]) && !isNaN(xyz[ 2 ]); })
            .map((xyz) => { return xyz[ 0 ] });
        const minX = Math.min(...dev_null);


        // min y
        dev_null = list
            .filter(( xyz ) => { return !isNaN(xyz[ 1 ]) && !isNaN(xyz[ 1 ]) && !isNaN(xyz[ 2 ]); })
            .map((xyz) => { return xyz[ 1 ] });
        const minY = Math.min(...dev_null);


        // min z
        dev_null = list
            .filter(( xyz ) => { return !isNaN(xyz[ 2 ]) && !isNaN(xyz[ 1 ]) && !isNaN(xyz[ 2 ]); })
            .map((xyz) => { return xyz[ 2 ] });
        const minZ = Math.min(...dev_null);

        // max x
        dev_null = list
            .filter(( xyz ) => { return !isNaN(xyz[ 0 ]) && !isNaN(xyz[ 1 ]) && !isNaN(xyz[ 2 ]); })
            .map((xyz) => { return xyz[ 0 ] });
        const maxX = Math.max(...dev_null);


        // max y
        dev_null = list
            .filter(( xyz ) => { return !isNaN(xyz[ 1 ]) && !isNaN(xyz[ 1 ]) && !isNaN(xyz[ 2 ]); })
            .map((xyz) => { return xyz[ 1 ] });
        const maxY = Math.max(...dev_null);


        // max z
        dev_null = list
            .filter(( xyz ) => { return !isNaN(xyz[ 2 ]) && !isNaN(xyz[ 1 ]) && !isNaN(xyz[ 2 ]); })
            .map((xyz) => { return xyz[ 2 ] });
        const maxZ = Math.max(...dev_null);

        // bbox
        segments[ key ].bbox   = [ minX, maxX, minY, maxY, minZ, maxZ ];

        // target - centroid of molecule. where will will aim the camera
        const [ targetX, targetY, targetZ ] = [ (maxX+minX)/2, (maxY+minY)/2, (maxZ+minZ)/2 ];
        segments[ key ].target = [ targetX, targetY, targetZ ];

        // size of bounding cube
        const [ extentX, extentY, extentZ ] = [ maxX-minX, maxY-minY, maxZ-minZ ];
        segments[ key ].extent = [ extentX, extentY, extentZ ];

        // where to position the camera. the camera with look at the target
        segments[ key ].cameraPosition = [ targetX - extentX, targetY + extentY, targetZ - extentZ ];

    }

    const currentKey = '2489';
    const [ targetX, targetY, targetZ ] = segments[ currentKey ].target;
    const target = new THREE.Vector3(targetX, targetY, targetZ);

    const [ extentX, extentY, extentZ ] = segments[ currentKey ].extent;

    const [ cameraPositionX, cameraPositionY, cameraPositionZ ] = segments[ currentKey ].cameraPosition;

    camera.position.set(cameraPositionX, cameraPositionY, cameraPositionZ);
    camera.lookAt( target );

    let dimen = 0.5 * Math.max(extentX, extentY, extentZ);
    dimen = Math.sqrt(dimen*dimen + (2 * dimen*dimen));
    camera.near = 0.05 * dimen;
    camera.far  = 4.00 * dimen;

    orbitControl.screenSpacePanning = false;
    orbitControl.target = target;
    orbitControl.update();
    orbitControl.addEventListener("change", () => renderer.render(scene, camera));

    const groundPlane = new THREE.GridHelper(2 * Math.max(extentX, extentY, extentZ), 16, appleCrayonColor('steel'), appleCrayonColor('steel'));
    groundPlane.position.set(targetX, targetY, targetZ);
    scene.add( groundPlane );

    xyz_list = segments[ currentKey ].xyz;

    // spheres
    let idx = 0
    for (let position of xyz_list) {
        sphereWithCenter(position, 24, scene, idx);
        idx++
    }

    // cylinders
    for (let i = 0, j = 1; j < xyz_list.length; ++i, ++j) {

        cylinderWithEndPoints(xyz_list[i], xyz_list[j], scene);

        // lineWithLerpedColorBetweenEndPoints(
        //     xyz_list[i],
        //     xyz_list[j],
        //     new THREE.Color( appleCrayonColor('lime') ),
        //     new THREE.Color( appleCrayonColor('strawberry') ),
        //     scene);
    }

    window.addEventListener( 'resize', onWindowResize, false );

    renderer.render( scene, camera );

};

let onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.render( scene, camera );
};

let sphereWithCenter = (center, radius, scene, idx) => {

    const [ x, y, z ] = center;
    if (isNaN(x)) {
        return;
    }

    const flatColor = new THREE.MeshBasicMaterial();
    let index = xyz_list.indexOf(center);

    // advance past dark crayon color names.
    index += 24;

    // modulo
    index %= appleCrayonNames.length;

    const name = appleCrayonNames[ index ];
    //flatColor.color = new THREE.Color( appleCrayonColor(name) );

    // Transition from blue -> red over 60 steps
    const step = idx / 60
    const blue = Math.floor(Math.min(255, step * 255))
    const green = 0
    const red = 255 - blue

    flatColor.color = new THREE.Color(`rgb(${red},${green},${blue})`)

    const showNormals = new THREE.MeshNormalMaterial();

    const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), flatColor);
    sphere.position.set(x, y, z);

    scene.add(sphere);
};

let lineWithLerpedColorBetweenEndPoints = (a, b, aColor, bColor, scene) => {

    const [ x0, y0, z0 ] = a;
    const [ x1, y1, z1 ] = b;
    if (isNaN(x0) || isNaN(x1)) {
        return;
    }

    let positions = [];
    positions.push( a[0], a[1], a[2] );
    positions.push( b[0], b[1], b[2] );

    let colors = [];
    colors.push( aColor.r, aColor.g, aColor.b );
    colors.push( bColor.r, bColor.g, bColor.b );

    var lineGeometry = new LineGeometry();
    lineGeometry.setPositions( positions );
    lineGeometry.setColors( colors );

    const lineMaterial = new LineMaterial( { color: appleCrayonColor('snow'), linewidth: 5, vertexColors: THREE.VertexColors, dashed: false } );

    let line = new Line2( lineGeometry, lineMaterial );
    line.computeLineDistances();
    line.scale.set( 1, 1, 1 );
    scene.add( line );

};

let cylinderWithEndPoints = (a, b, scene) => {

    const [ x0, y0, z0 ] = a;
    const [ x1, y1, z1 ] = b;
    if (isNaN(x0) || isNaN(x1)) {
        return;
    }

    const path = new THREE.CatmullRomCurve3([ new THREE.Vector3( x0, y0, z0 ), new THREE.Vector3( x1, y1, z1 ) ]);

    const flatColor = new THREE.MeshBasicMaterial();
    flatColor.color = new THREE.Color( appleCrayonColor('aluminum') );

    const showNormals = new THREE.MeshNormalMaterial();

    const radius = 4;
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(path, 4, radius, 16, false), flatColor));
};

export { main };
