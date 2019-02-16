import * as THREE from './threejs_es6/three.module.js';

import { appleCrayonColorThreeJS } from './color.js';
import SegmentManager from './segmentManager.js';
import CubicMapManager from "./cubicMapManager.js";
import EventBus from './eventBus.js';
import SceneManager from './sceneManager.js';

import BedTrack from './igv/bedTrack.js';
import TrackManager from './trackManager.js';
import Picker from './picker.js';

let segmentManager;
let trackManager;
let diffuseCubicMapManager;

let sphereGeometry;

let showNormalsMaterial;
let showSTMaterial;

let globalEventBus = new EventBus();
let sceneManager;

let main = container => {

    const sceneManagerConfig =
        {
            container: container,
            scene: new THREE.Scene(),
            renderer: new THREE.WebGLRenderer({ antialias: true }),
            picker: new Picker( { raycaster: new THREE.Raycaster() } )
        };

    sceneManager = new SceneManager(sceneManagerConfig);

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

    // trackManager = new TrackManager({ bedTrack: new BedTrack('data/tracks/IMR-90_CTCF_27-31.bed') });
    trackManager = new TrackManager({ track: new BedTrack('data/tracks/IMR-90_RAD21_27-31.bed') });

    setup({ sceneManager, segmentManager, trackManager })
        .then(() => {
            renderLoop();
        });
};

let setup = async ({ sceneManager, segmentManager, trackManager }) => {

    const path = 'data/csv/IMR90_chr21-28-30Mb.csv';
    await segmentManager.loadSegments({path});

    await trackManager.buildFeatureSegmentIndices({ chr: 'chr21', start: segmentManager.genomicStart, step: segmentManager.stepSize });

    const key = '1937';
    let segment = segmentManager.segmentWithName(key);

    sceneManager.configure({ chr: segmentManager.chr, genomicStart: segmentManager.genomicStart, genomicEnd: segmentManager.genomicEnd, segment });

    // ball
    const sphereRadius = 24;
    sphereGeometry = new THREE.SphereGeometry(sphereRadius, 32, 16);

    segmentManager.objects = [];
    for(let seg of segment) {

        const [ x, y, z ] = seg.xyz;
        const doSkip = isNaN(x) || isNaN(y) || isNaN(z);

        if (!doSkip) {

            // const material = new THREE.MeshLambertMaterial({ color: trackManager.colorForFeatureSegmentIndex({ index: seg.segmentIndex, listLength: segment.length }) });
            const material = new THREE.MeshBasicMaterial({ color: trackManager.colorForSegmentIndex({ index: seg.segmentIndex, firstIndex: 1, lastIndex: segment[segment.length - 1].segmentIndex }) });
            // const material = diffuseCubicMapManager.material;

            const mesh = new THREE.Mesh(sphereGeometry, material);
            mesh.position.set(x, y, z);

            const key = mesh.uuid;
            segmentManager.objects[ seg.segmentIndex ] =
                {
                    'mesh' : mesh,
                    'genomicLocation' : (seg.segmentIndex - 1) * 3e4 + segmentManager.genomicStart,
                };

            sceneManager.scene.add(mesh);

        }

    }

    // stick
    for (let i = 0, j = 1; j < segment.length; ++i, ++j) {

        const [ x0, y0, z0 ] = segment[i].xyz;
        const [ x1, y1, z1 ] = segment[j].xyz;
        const doSkip = isNaN(x0) || isNaN(x1);

        if (!doSkip) {
            const axis = new THREE.CatmullRomCurve3([ new THREE.Vector3( x0, y0, z0 ), new THREE.Vector3( x1, y1, z1 ) ]);
            const geometry = new THREE.TubeGeometry(axis, 8, sphereRadius/4, 16, false);

            // const material = new THREE.MeshLambertMaterial({ color: appleCrayonColorThreeJS('nickel') });
            const material = new THREE.MeshBasicMaterial({ color: appleCrayonColorThreeJS('aluminum') });
            // const material = diffuseCubicMapManager.material;
            sceneManager.scene.add(new THREE.Mesh(geometry, material));
        }

    }

};

let renderLoop = () => {
    requestAnimationFrame( renderLoop );
    sceneManager.renderer.render(sceneManager.scene, sceneManager.orbitalCamera.camera)
};

export { main, globalEventBus, sceneManager };
