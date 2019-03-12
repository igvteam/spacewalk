import * as THREE from './threejs_es6/three.module.js';
import { globalEventBus } from './eventBus.js';
import SceneManager from './sceneManager.js';
import SegmentManager from './segmentManager.js';
import CubicMapManager from "./cubicMapManager.js";
import Picker from './picker.js';
import PickHighlighter from './pickHighlighter.js';
import TrackManager from './trackManager.js';
import { appleCrayonColorHexValue, appleCrayonColorThreeJS, rgb255ToThreeJSColor, appleCrayonColorRGB255 } from './color.js';
import SegmentGridSelectPalette from "./segmentGridSelectPalette.js";
import DataFileLoader from "./dataFileLoader.js";
import MoleculeSelect from "./moleculeSelect.js";

import SegmentSelectPalette from "./segmentSelectPalette.js";
import { parsePathEncodedGenomicLocation } from './segmentManager.js';
import IGVPalette from "./igvPalette.js";

let segmentManager;
let chromosomeSelect;
let dataFileLoader;
let igvPalette;
let segmentSelectPalette;
let segmentGridSelectPalette;
let trackManager;
let diffuseCubicMapManager;

let sphereGeometry;

let showNormalsMaterial;
let showSTMaterial;

let sceneManager;
let [ chr, genomicStart, genomicEnd ] = [ undefined, undefined, undefined ];

let main = async container => {

    const sceneManagerSettings =
        {
            container: container,
            backgroundColor: rgb255ToThreeJSColor(163, 237, 237),
            groundPlaneColor: appleCrayonColorHexValue('steel'),
            colorRampPaletteColors: [ appleCrayonColorRGB255('honeydew'), appleCrayonColorRGB255('clover') ],
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

    chromosomeSelect = new MoleculeSelect({ container, palette: $('#trace3d_molecule_select_palette').get(0) });

    dataFileLoader = new DataFileLoader({ container, palette: $('#trace3d_data_file_load_palette').get(0) });

    igvPalette = new IGVPalette({ container, palette: $('#trace3d_igv_palette').get(0) });

    // const url = 'https://www.encodeproject.org/files/ENCFF079FWO/@@download/ENCFF079FWO.bigBed';
    // const url = 'https://www.encodeproject.org/files/ENCFF079FWO/@@download/ENCFF079FWO.bigBed';

    const url = 'https://www.encodeproject.org/files/ENCFF298BFT/@@download/ENCFF298BFT.bigWig';
    // const url = 'https://www.encodeproject.org/files/ENCFF722EUH/@@download/ENCFF722EUH.bigWig';
    await igvPalette.loadLowLevelTrack({genomeID: 'hg38', url});

    await igvPalette.gotoDefaultLocus();

    // segmentSelectPalette = new SegmentSelectPalette(container);
    // segmentGridSelectPalette = new SegmentGridSelectPalette(container);

    sceneManager.defaultConfiguration();

    renderLoop();

    const eventListener =
        {
            receiveEvent: async ({ type, data }) => {
                let segment;

                if ("DidSelectSegment" === type) {

                    segment = segmentManager.segmentWithName( data );

                    sceneManager.dispose();
                    [ chr, genomicStart, genomicEnd ] = parsePathEncodedGenomicLocation(segmentManager.path);

                    setup({ sceneManager, chr, genomicStart, genomicEnd, segment });

                } else if ("DidLoadCSVFile" === type) {

                    let { name, payload } = data;

                    segmentManager.path = name;
                    segmentManager.ingest(payload);

                    [ chr, genomicStart, genomicEnd ] = parsePathEncodedGenomicLocation(segmentManager.path);

                    igvPalette.goto({ chr, start: genomicStart, end: genomicEnd });

                    const initialMoleculeKey = '0';
                    segment = segmentManager.segmentWithName( initialMoleculeKey );

                    // segmentSelectPalette.configure(segmentManager.segments);
                    // segmentGridSelectPalette.configure(segmentManager.segments);
                    chromosomeSelect.configure({ segments: segmentManager.segments, initialMoleculeKey });

                    sceneManager.dispose();

                    setup({ sceneManager, chr, genomicStart, genomicEnd, segment });

                }


            }
        };

    globalEventBus.subscribe("DidSelectSegment", eventListener);
    globalEventBus.subscribe("DidLoadCSVFile", eventListener);

};

let setup = ({ sceneManager, chr, genomicStart, genomicEnd, segment }) => {

    let [ segmentLength, segmentExtent, cameraPosition, centroid ] = [ segment.array.length, segment.extent, segment.cameraPosition, segment.centroid ];
    sceneManager.configure({ chr, genomicStart, genomicEnd, segmentLength, segmentExtent, cameraPosition, centroid });

    // ball
    const sphereRadius = 24;
    sphereGeometry = new THREE.SphereGeometry(sphereRadius, 32, 16);

    // Dictionay of segment indices. Key is UUID of 3D object
    sceneManager.objectUUID2SegmentIndex = {};

    // Array of 3D objects. Index is segment index.
    sceneManager.segmentIndex2Object = [];

    for(let item of segment.array) {

        const [ x, y, z ] = item.xyz;

        const doSkip = isNaN(x) || isNaN(y) || isNaN(z);

        if (!doSkip) {

            // const material = new THREE.MeshLambertMaterial({ color: trackManager.colorForFeatureSegmentIndex({ index: item.segmentIndex, listLength: segment.length }) });
            const material = new THREE.MeshBasicMaterial({ color: sceneManager.colorRampPalette.genomicRampWidget.colorForSegmentIndex(item.segmentIndex) });
            // const material = diffuseCubicMapManager.material;

            const mesh = new THREE.Mesh(sphereGeometry, material);
            mesh.position.set(x, y, z);

            sceneManager.objectUUID2SegmentIndex[ mesh.uuid ] =
                {
                    'segmentIndex' : item.segmentIndex,
                    'genomicLocation' : (item.segmentIndex - 1) * 3e4 + genomicStart,
                };

            sceneManager.segmentIndex2Object[ item.segmentIndex ] =
                {
                    'object' : mesh,
                    'genomicLocation' : (item.segmentIndex - 1) * 3e4 + genomicStart,
                };

            sceneManager.scene.add(mesh);

        }

    }

    // stick
    for (let i = 0, j = 1; j < segment.array.length; ++i, ++j) {

        const [ x0, y0, z0 ] = segment.array[i].xyz;
        const [ x1, y1, z1 ] = segment.array[j].xyz;

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

};

let renderLoop = () => {

    requestAnimationFrame( renderLoop );

    if (sceneManager.scene && sceneManager.orbitalCamera) {
        sceneManager.renderer.render(sceneManager.scene, sceneManager.orbitalCamera.camera);
    }

};

export { main, sceneManager };
