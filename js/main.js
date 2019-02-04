import * as THREE from './threejs_es6/three.module.js';

import LineGeometry from './threejs_es6/LineGeometry.js';
import LineMaterial from './threejs_es6/LineMaterial.js';
import Line2        from './threejs_es6/Line2.js';

import OrbitControls from './threejs_es6/orbit-controls-es6.js';

import { appleCrayonNames, appleCrayonColorHexValue, appleCrayonColorThreeJS } from './ei_color.js';
import SequenceManager from './sequenceManager.js';

import BedTrack from './igv/bedTrack.js'

let scene;
let renderer;
let camera;
let orbitControl;

const genomicChr = "chr21"
const genomicStart = 28000071
const genomicStep = 30000

// Compute the segment indexes containing a feature.  Quick hack, this is not the right place to do this but
// I don't know how to change sphere color after its placed in scene
let featureSegmentIndexes = new Set()
let initDemoTrack = async (path) => {
    const bedTrack = new BedTrack(path)
    const bedFeatures = await bedTrack.getFeatures(genomicChr)
    for (let feature of bedFeatures) {
        // Segment index (first sgement is 1)
        const idx = Math.floor((feature.start - genomicStart) / genomicStep) + 1
        if(idx >= 0) {
            console.log(idx + "  " + (genomicStart + (idx-1)*( genomicStep)) + "-" + (genomicStart + idx*genomicStep))
            featureSegmentIndexes.add(idx)
        }
    }
}

let main = (threejs_canvas) => {

    renderer = new THREE.WebGLRenderer({ canvas: threejs_canvas, antialias: true });
    renderer.setClearColor(appleCrayonColorHexValue('iron'));
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    const [ near, far, fov ] = [ 1e-1, 1e5, 35 ];
    camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, near, far);
    orbitControl = new OrbitControls(camera, renderer.domElement);

    scene = new THREE.Scene();
    scene.background = appleCrayonColorThreeJS('iron');

    setup(scene, renderer, camera, orbitControl);
};

let setup = async (scene, renderer, camera, orbitControl) => {

    const path = 'data/csv/IMR90_chr21-28-30Mb.csv';

    //initDemoTrack('data/tracks/IMR-90_CTCF_27-31.bed')
    initDemoTrack('data/tracks/IMR-90_RAD21_27-31.bed')


    const response = await fetch(path);
    const text = await response.text();


    const lines = text.split(/\r?\n/);

    // discard blurb
    lines.shift();

    // discard column titles
    lines.shift();

    // chr index | segment index | Z | X | y
    let [ chrIndexCurrent, molIndex ] = [ undefined, undefined ];
    let segments = {};

    // const reversed = lines.reverse();
    for (let line of lines) {

        if ("" === line) {
            // do nothing
            console.log('ignore blank line');
        } else {

            const parts = line.split(',');

            const index = parseInt(parts[ 0 ], 10) - 1;

            molIndex = index.toString();

            if (undefined === chrIndexCurrent || chrIndexCurrent !== molIndex) {
                chrIndexCurrent = molIndex;

                segments[ chrIndexCurrent ] = [];
            }

            const segIndex = parseInt(parts[1])


            // discard chr index
            parts.shift();

            // discard segment index
            parts.shift();

            let [ z, x, y ] = parts.map((token) => { return 'nan' === token ? NaN : parseFloat(token); });
            segments[ chrIndexCurrent ].push({
                molIndex: molIndex,
                segmentIndex: segIndex,
                xyz: [ x, y, z ]
            });

        }

    }

    let dev_null;

    let keys = Object.keys(segments);

    // diagnostics
    // let [ first_key, last_key ] = [ keys[ 0 ],             keys[ (keys.length - 1) ]];
    // let [ first,     last     ] = [ segments[ first_key ], segments[ last_key ]];


    for (let key of keys) {

        const list = segments[ key ].map(seg => seg.xyz);


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
    let currentSegments = segments[currentKey]
    const [ targetX, targetY, targetZ ] = currentSegments.target;
    const target = new THREE.Vector3(targetX, targetY, targetZ);

    const [ extentX, extentY, extentZ ] = currentSegments.extent;

    const [ cameraPositionX, cameraPositionY, cameraPositionZ ] = currentSegments.cameraPosition;

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

    const groundPlane = new THREE.GridHelper(2 * Math.max(extentX, extentY, extentZ), 16, appleCrayonColorHexValue('steel'), appleCrayonColorHexValue('steel'));
    groundPlane.position.set(targetX, targetY, targetZ);
    scene.add( groundPlane );


    for(let seg of currentSegments) {
        sphereForSegment(seg, 24, scene);
    }

    // cylinders
    //for (let i = 0, j = 1; j < xyz_list.length; ++i, ++j) {
    for (let i = 0, j = 1; j < currentSegments.length; ++i, ++j) {

        cylinderWithEndPoints(currentSegments[i].xyz, currentSegments[j].xyz, scene);

        // lineWithLerpedColorBetweenEndPoints(
        //     currentSetments[i].xyz,
        //     currentSetments[j].xyz,
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

let sphereForSegment = (segment, radius, scene) => {

    const [x, y, z] = segment.xyz

    if (isNaN(x)) {
        return;
    }

    const flatColor = new THREE.MeshBasicMaterial();
    const index = segment.segmentIndex

    // advance past dark crayon color names.
    //index += 24;

    // modulo
    //index %= appleCrayonNames.length;

   // const name = appleCrayonNames[ index ];
    //flatColor.color = new THREE.Color( appleCrayonColor(name) );

    // Transition from blue -> red over 60 steps
    const step = index / 60
    const red = Math.floor(Math.min(255, step * 255))
    const green = 0
    const blue = 255 - red

    flatColor.color = new THREE.Color(featureSegmentIndexes.has(segment.segmentIndex) ? 'rgb(0, 255, 0)': `rgb(${red},${green},${blue})`)

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

    const lineMaterial = new LineMaterial( { color: appleCrayonColorHexValue('snow'), linewidth: 5, vertexColors: THREE.VertexColors, dashed: false } );

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
    flatColor.color = appleCrayonColorThreeJS('aluminum');

    const showNormals = new THREE.MeshNormalMaterial();

    const radius = 4;
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(path, 4, radius, 16, false), flatColor));
};

export { main };
