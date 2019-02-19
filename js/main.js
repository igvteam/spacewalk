import * as THREE from './threejs_es6/three.module.js';
import EventBus from './eventBus.js';
import SceneManager from './sceneManager.js';
import SegmentManager from './segmentManager.js';
import CubicMapManager from "./cubicMapManager.js";
import Picker from './picker.js';
import PickHighlighter from './pickHighlighter.js';
import TrackManager from './trackManager.js';
import BedTrack from './igv/bedTrack.js';
import { appleCrayonColorHexValue, appleCrayonColorThreeJS, rgb255ToThreeJSColor, appleCrayonColorRGB255 } from './color.js';

let segmentManager;
let trackManager;
let diffuseCubicMapManager;

let sphereGeometry;

let showNormalsMaterial;
let showSTMaterial;

let globalEventBus = new EventBus();
let sceneManager;

let startTime;
let endTime;
let main = async container => {

    const sceneManagerSettings =
        {
            container: container,
            scene: new THREE.Scene(),
            backgroundColor: rgb255ToThreeJSColor(163, 237, 237),
            groundPlaneColor: appleCrayonColorHexValue('steel'),
            toolPaletteColors: [ appleCrayonColorRGB255('honeydew'), appleCrayonColorRGB255('clover') ],
            renderer: new THREE.WebGLRenderer({ antialias: true }),
            picker: new Picker( { raycaster: new THREE.Raycaster(), pickHighlighter: new PickHighlighter(appleCrayonColorThreeJS('maraschino')) } )
        };

    sceneManager = new SceneManager(sceneManagerSettings);

    const diffuseCubicMapMaterialConfig =
        {
            // textureRoot: 'texture/cubic/diffuse/aerodynamics_workshop/',
            textureRoot: 'texture/cubic/diagnostic/threejs_format/',
            suffix: '.png',
            vertexShaderName: 'diffuse_cube_vert',
            fragmentShaderName: 'diffuse_cube_frag',
            isSpecularMap: false
        };

    diffuseCubicMapManager = new CubicMapManager(diffuseCubicMapMaterialConfig);

    showNormalsMaterial = new THREE.MeshNormalMaterial();

    const showSTMaterialConfig =
        {
            uniforms: {},
            vertexShader: document.getElementById( 'show_st_vert' ).textContent,
            fragmentShader: document.getElementById( 'show_st_frag' ).textContent
        };

    showSTMaterial = new THREE.ShaderMaterial(showSTMaterialConfig );

    segmentManager = new SegmentManager();

    trackManager = new TrackManager();

    startTime = Date.now();

    const path = 'data/csv/IMR90_chr21-28-30Mb.csv';
    await segmentManager.loadSegments({ path });

    endTime = Date.now();
    console.log('segmentManager.loadSegments - done ' + (endTime - startTime));

    startTime = endTime;

    const trackManagerConfig =
        {
            track: new BedTrack('data/tracks/IMR-90_RAD21_27-31.bed'),
            chr: segmentManager.chr,
            start: segmentManager.genomicStart,
            stepSize: segmentManager.stepSize
        };
    await trackManager.buildFeatureSegmentIndices(trackManagerConfig);

    endTime = Date.now();
    console.log('trackManager.buildFeatureSegmentIndices - done ' + (endTime - startTime));

    const key = '1234';

    const setupConfig =
        {
            sceneManager: sceneManager,
            chr: segmentManager.chr,
            genomicStart: segmentManager.genomicStart,
            genomicEnd: segmentManager.genomicEnd,
            segment: segmentManager.segmentWithName(key),

        };
    await setup(setupConfig);

    renderLoop();

};

let setup = async ({ sceneManager, chr, genomicStart, genomicEnd, segment }) => {

    startTime = endTime;

    const sceneManagerConfig =
        {
            chr: chr,
            genomicStart: genomicStart,
            genomicEnd: genomicEnd,
            segmentLength: segment.length,
            segmentExtent: segment.extent,
            cameraPosition: segment.cameraPosition,
            centroid: segment.centroid
        };

    sceneManager.configure(sceneManagerConfig);

    endTime = Date.now();
    console.log('sceneManager.configure - done ' + (endTime - startTime));

    // ball
    startTime = endTime;
    const sphereRadius = 24;
    sphereGeometry = new THREE.SphereGeometry(sphereRadius, 32, 16);

    // Dictionay of segment indices. Key is UUID of 3D object
    sceneManager.objectUUID2SegmentIndex = {};

    // Array of 3D objects. Index is segment index.
    sceneManager.segmentIndex2Object = [];

    for(let seg of segment) {

        const [ x, y, z ] = seg.xyz;

        const doSkip = isNaN(x) || isNaN(y) || isNaN(z);

        if (!doSkip) {

            // const material = new THREE.MeshLambertMaterial({ color: trackManager.colorForFeatureSegmentIndex({ index: seg.segmentIndex, listLength: segment.length }) });
            const material = new THREE.MeshBasicMaterial({ color: sceneManager.toolPalette.genomicRampWidget.colorForSegmentIndex(seg.segmentIndex) });
            // const material = diffuseCubicMapManager.material;

            const mesh = new THREE.Mesh(sphereGeometry, material);
            mesh.position.set(x, y, z);

            sceneManager.objectUUID2SegmentIndex[ mesh.uuid ] =
                {
                    'segmentIndex' : seg.segmentIndex,
                    'genomicLocation' : (seg.segmentIndex - 1) * 3e4 + genomicStart,
                };

            sceneManager.segmentIndex2Object[ seg.segmentIndex ] =
                {
                    'object' : mesh,
                    'genomicLocation' : (seg.segmentIndex - 1) * 3e4 + genomicStart,
                };

            sceneManager.scene.add(mesh);

        }

    }

    endTime = Date.now();
    console.log('balls - done ' + (endTime - startTime));

    // stick
    startTime = endTime;
    for (let i = 0, j = 1; j < segment.length; ++i, ++j) {

        const [ x0, y0, z0 ] = segment[i].xyz;
        const [ x1, y1, z1 ] = segment[j].xyz;

        const doSkip = isNaN(x0) || isNaN(x1);

        if (!doSkip) {

            const axis = new THREE.CatmullRomCurve3([ new THREE.Vector3( x0, y0, z0 ), new THREE.Vector3( x1, y1, z1 ) ]);
            const geometry = new THREE.TubeGeometry(axis, 8, sphereRadius/8, 16, false);

            // const material = new THREE.MeshLambertMaterial({ color: appleCrayonColorThreeJS('nickel') });

            const material = new THREE.MeshBasicMaterial({ color: appleCrayonColorThreeJS('aluminum') });

            // const material = diffuseCubicMapManager.material;

            sceneManager.scene.add(new THREE.Mesh(geometry, material));
        }

    }

    endTime = Date.now();
    console.log('sticks - done ' + (endTime - startTime));

};

let renderLoop = () => {
    requestAnimationFrame( renderLoop );
    sceneManager.renderer.render(sceneManager.scene, sceneManager.orbitalCamera.camera)
};

export { main, globalEventBus, sceneManager };
