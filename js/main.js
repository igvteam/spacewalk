import * as THREE from './threejs_es6/three.module.js';
import SceneManager from './sceneManager.js';
import CubicMapManager from './cubicMapManager.js';
import Picker from './picker.js';
import PickHighlighter from './pickHighlighter.js';
import DataFileLoader from './dataFileLoader.js';
import StructureSelect from './structureSelect.js';
import StructureManager from './structureManager.js';
import IGVPalette from './igvPalette.js';

import { parsePathEncodedGenomicLocation } from './structureManager.js';
import { appleCrayonColorHexValue, appleCrayonColorThreeJS, rgb255ToThreeJSColor, appleCrayonColorRGB255 } from './color.js';
import { globalEventBus } from './eventBus.js';

let structureManager;

let structureSelect;

let dataFileLoader;

let igvPalette;

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

    structureManager = new StructureManager();

    structureSelect = new StructureSelect({ container, palette: $('#trace3d_structure_select_palette').get(0) });

    dataFileLoader = new DataFileLoader({ container, palette: $('#trace3d_data_file_load_palette').get(0) });

    igvPalette = new IGVPalette({ container, palette: $('#trace3d_igv_palette').get(0) });

    // const url = 'https://www.encodeproject.org/files/ENCFF079FWO/@@download/ENCFF079FWO.bigBed';
    // const url = 'https://www.encodeproject.org/files/ENCFF079FWO/@@download/ENCFF079FWO.bigBed';

    const url = 'https://www.encodeproject.org/files/ENCFF298BFT/@@download/ENCFF298BFT.bigWig';
    // const url = 'https://www.encodeproject.org/files/ENCFF722EUH/@@download/ENCFF722EUH.bigWig';
    await igvPalette.loadLowLevelTrack({genomeID: 'hg38', url});

    await igvPalette.gotoDefaultLocus();

    sceneManager.defaultConfiguration();

    renderLoop();

    const eventListener =
        {
            receiveEvent: async ({ type, data }) => {
                let structure;

                if ('DidSelectStructure' === type) {

                    structure = structureManager.structureWithName(data);

                    sceneManager.dispose();
                    [ chr, genomicStart, genomicEnd ] = parsePathEncodedGenomicLocation(structureManager.path);

                    setup({ sceneManager, chr, genomicStart, genomicEnd, structure });

                } else if ('DidLoadCSVFile' === type) {

                    let { name, payload } = data;

                    structureManager.path = name;
                    structureManager.ingest(payload);

                    [ chr, genomicStart, genomicEnd ] = parsePathEncodedGenomicLocation(structureManager.path);

                    igvPalette.goto({ chr, start: genomicStart, end: genomicEnd });

                    const initialStructureKey = '0';
                    structure = structureManager.structureWithName(initialStructureKey);

                    structureSelect.configure({ structures: structureManager.structures, initialStructureKey });

                    sceneManager.dispose();

                    setup({ sceneManager, chr, genomicStart, genomicEnd, structure });

                }


            }
        };

    globalEventBus.subscribe('DidSelectStructure', eventListener);
    globalEventBus.subscribe('DidLoadCSVFile', eventListener);

};

let setup = ({ sceneManager, chr, genomicStart, genomicEnd, structure }) => {

    let [ structureLength, structureExtent, cameraPosition, centroid ] = [ structure.array.length, structure.extent, structure.cameraPosition, structure.centroid ];
    sceneManager.configure({ chr, genomicStart, genomicEnd, structureLength, structureExtent, cameraPosition, centroid });

    // ball
    const sphereRadius = 24;
    sphereGeometry = new THREE.SphereGeometry(sphereRadius, 32, 16);

    // Dictionay of segment indices. Key is UUID of 3D object
    sceneManager.objectUUID2SegmentIndex = {};

    // Array of 3D objects. Index is segment index.
    sceneManager.segmentIndex2Object = [];

    for(let item of structure.array) {

        const [ x, y, z ] = item.xyz;

        const doSkip = isNaN(x) || isNaN(y) || isNaN(z);

        if (!doSkip) {

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
    for (let i = 0, j = 1; j < structure.array.length; ++i, ++j) {

        const [ x0, y0, z0 ] = structure.array[i].xyz;
        const [ x1, y1, z1 ] = structure.array[j].xyz;

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
