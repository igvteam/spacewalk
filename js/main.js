import * as THREE from './threejs_es6/three.module.js';
import GUIManager from './guiManager.js';
import SceneManager from './sceneManager.js';
import Picker from './picker.js';
import PickHighlighter from './pickHighlighter.js';
import DataFileLoadModal from './dataFileLoadModal.js';
import StructureSelectPanel from './structureSelectPanel.js';
import StructureManager from './structureManager.js';
import { parsePathEncodedGenomicLocation } from './structureManager.js';
import IGVPanel from './IGVPanel.js';
import JuiceboxPanel from './juiceboxPanel.js';
import { mouseHandler, igvDefaultConfiguration } from "./IGVPanel.js";
import { appleCrayonColorHexValue, appleCrayonColorThreeJS, appleCrayonColorRGB255 } from './color.js';
import { globalEventBus } from './eventBus.js';
import ColorRampPanel from "./colorRampPanel.js";


let guiManager;

let structureManager;

let structureSelect;

let dataFileLoader;

let igvPalette;

let juiceboxPalette;

let sceneManager;

let [ chr, genomicStart, genomicEnd ] = [ undefined, undefined, undefined ];

let doUpdateCameraPose = true;

let main = async container => {

    guiManager = new GUIManager({ $button: $('#trace3d_ui_manager_button'), $panel: $('#trace3d_ui_manager_panel') });

    dataFileLoader = new DataFileLoadModal({ $urlModal: $('#trace3d-file-load-url-modal'), $selectModal: $('#trace3d-file-load-select-modal')});

    structureSelect = new StructureSelectPanel({ container, panel: $('#trace3d_structure_select_panel').get(0) });

    juiceboxPalette = new JuiceboxPanel({ container, panel: $('#trace3d_juicebox_panel').get(0) });

    const juiceboxBrowserConfig =
        {
            container: $('#trace3d_juicebox_root_container'),
            // figureMode: true,
            width: 400,
            height: 400
        };

    let juiceboxBrowser = await juiceboxPalette.createBrowser(juiceboxBrowserConfig);

    if (juiceboxBrowser) {
        juiceboxPalette.defaultConfiguration();
    }

    igvPalette = new IGVPanel({ container, panel: $('#trace3d_igv_panel').get(0) });

    const igvBrowserConfig = igvDefaultConfiguration();
    let igvBrowser = await igvPalette.createBrowser(igvBrowserConfig);

    // const igvBrowserConfig =
    //     {
    //         genome: 'hg38',
    //         locus: 'all',
    //         showCursorTrackingGuide: true,
    //         showTrackLabels: false,
    //         showIdeogram: false,
    //         showControls: false,
    //         showNavigation: false
    //     };
    //
    // let igvBrowser = await igvPalette.createBrowser(igvBrowserConfig);

    // if (igvBrowser) {
    //     await igvPalette.defaultConfiguration();
    // }

    const highlightColor = appleCrayonColorThreeJS('maraschino');

    const colorRampPaletteConfig =
        {
            container,
            panel: $('#trace3d_color_ramp_panel').get(0),
            colors:
                [
                    appleCrayonColorRGB255('honeydew'),
                    appleCrayonColorRGB255('clover')
                ],
            highlightColor
        };

    const sceneManagerConfig =
        {
            container: container,

            ballRadius: 24,

            stickMaterial: new THREE.MeshPhongMaterial({ color: appleCrayonColorThreeJS('aluminum') }),

            backgroundColor: appleCrayonColorThreeJS('mercury'),

            groundPlaneColor: appleCrayonColorHexValue('steel'),

            colorRampPalette: new ColorRampPanel(colorRampPaletteConfig),

            renderer: new THREE.WebGLRenderer({ antialias: true }),

            picker: new Picker( { raycaster: new THREE.Raycaster(), pickHighlighter: new PickHighlighter(highlightColor) } ),

            // skyColor | groundColor | intensity
            hemisphereLight: new THREE.HemisphereLight( appleCrayonColorHexValue('snow'), appleCrayonColorHexValue('nickel'), 1 )
        };

    sceneManager = new SceneManager(sceneManagerConfig);

    sceneManager.defaultConfiguration();

    structureManager = new StructureManager();

    renderLoop();

    const eventListener =
        {
            receiveEvent: async ({ type, data }) => {
                let structure;

                if ('DidSelectStructure' === type) {

                    structure = structureManager.structureWithName(data);

                    igvBrowser.cursorGuide.setCustomMouseHandler(({ bp, start, end, interpolant }) => {
                        mouseHandler({ bp, start, end, interpolant, structureLength: structure.array.length })
                    });

                    sceneManager.dispose();
                    [ chr, genomicStart, genomicEnd ] = parsePathEncodedGenomicLocation(structureManager.path);

                    setup({ sceneManager, chr, genomicStart, genomicEnd, structure });

                } else if ('DidLoadFile' === type) {

                    let { name, payload } = data;

                    $('.navbar').find('#trace3d-file-name').text(name);

                    structureManager.path = name;
                    structureManager.ingest(payload);

                    [ chr, genomicStart, genomicEnd ] = parsePathEncodedGenomicLocation(structureManager.path);

                    igvPalette.goto({ chr, start: genomicStart, end: genomicEnd });

                    juiceboxPalette.goto({ chr, start: genomicStart, end: genomicEnd });

                    const initialStructureKey = '0';

                    structure = structureManager.structureWithName(initialStructureKey);

                    igvBrowser.cursorGuide.setCustomMouseHandler(({ bp, start, end, interpolant }) => {
                        mouseHandler({ bp, start, end, interpolant, structureLength: structure.array.length })
                    });

                    structureSelect.configure({ structures: structureManager.structures, initialStructureKey });

                    sceneManager.dispose();

                    setup({ sceneManager, chr, genomicStart, genomicEnd, structure });

                    doUpdateCameraPose = false;

                } else if ('ToggleUIControls' === type) {
                    $('.navbar').toggle();
                }

            }
        };

    globalEventBus.subscribe('DidSelectStructure', eventListener);
    globalEventBus.subscribe('DidLoadFile', eventListener);
    globalEventBus.subscribe("ToggleUIControls", eventListener);
};

let setup = ({ sceneManager, chr, genomicStart, genomicEnd, structure }) => {

    let [ structureLength, structureExtent, cameraPosition, structureCentroid ] = [ structure.array.length, structure.extent, structure.cameraPosition, structure.centroid ];
    sceneManager.configure({ chr, genomicStart, genomicEnd, structureLength, structureExtent, cameraPosition, structureCentroid, doUpdateCameraPose });

    // Dictionay of segment indices. Key is UUID of 3D object
    sceneManager.objectUUID2SegmentIndex = {};

    // Array of 3D objects. Index is segment index.
    sceneManager.segmentIndex2Object = [];

    // balls
    for(let item of structure.array) {

        const [ x, y, z ] = item.xyz;

        const doSkip = isNaN(x) || isNaN(y) || isNaN(z);

        if (!doSkip) {

            const color = sceneManager.colorRampPalette.genomicRampWidget.colorForSegmentIndex(item.segmentIndex);
            // const ballMaterial = new THREE.MeshPhongMaterial({ color, envMap: specularCubicTexture });
            const ballMaterial = new THREE.MeshPhongMaterial({ color });

            const ballMesh = new THREE.Mesh(sceneManager.ballGeometry, ballMaterial);
            ballMesh.position.set(x, y, z);

            sceneManager.objectUUID2SegmentIndex[ ballMesh.uuid ] =
                {
                    'segmentIndex' : item.segmentIndex,
                    'genomicLocation' : (item.segmentIndex - 1) * 3e4 + genomicStart,
                };

            sceneManager.segmentIndex2Object[ item.segmentIndex ] =
                {
                    'object' : ballMesh,
                    'genomicLocation' : (item.segmentIndex - 1) * 3e4 + genomicStart,
                };

            sceneManager.scene.add(ballMesh);

        }

    }

    // sticks
    for (let i = 0, j = 1; j < structure.array.length; ++i, ++j) {

        const [ x0, y0, z0 ] = structure.array[i].xyz;
        const [ x1, y1, z1 ] = structure.array[j].xyz;

        const doSkip = isNaN(x0) || isNaN(x1);

        if (!doSkip) {

            const axis = new THREE.CatmullRomCurve3([ new THREE.Vector3( x0, y0, z0 ), new THREE.Vector3( x1, y1, z1 ) ]);
            const stickGeometry = new THREE.TubeBufferGeometry(axis, 8, sceneManager.ballRadius/8, 16, false);

            const stickMesh = new THREE.Mesh(stickGeometry, sceneManager.stickMaterial);
            stickMesh.name = 'stick';

            sceneManager.scene.add( stickMesh );
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
