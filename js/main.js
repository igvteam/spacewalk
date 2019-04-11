import * as THREE from './threejs_es6/three.module.js';

import GUIManager from './guiManager.js';
import SceneManager from './sceneManager.js';
import DataFileLoadModal from './dataFileLoadModal.js';
import StructureSelectPanel from './structureSelectPanel.js';
import StructureManager from './structureManager.js';
import IGVPanel from './IGVPanel.js';
import JuiceboxPanel from './juiceboxPanel.js';

import { globalEventBus } from './eventBus.js';
import { mouseHandler, igvConfigurator } from "./IGVPanel.js";
import { sceneManagerConfigurator } from './sceneManager.js';
import { parsePathEncodedGenomicLocation } from './structureManager.js';

let guiManager;

let structureManager;

let structureSelectPanel;

let dataFileLoadeModal;

let igvPanel;
let igvBrowser;

let juiceboxPanel;

let sceneManager;

let [ chr, genomicStart, genomicEnd ] = [ undefined, undefined, undefined ];

let doUpdateCameraPose = true;

let main = async container => {

    guiManager = new GUIManager({ $button: $('#trace3d_ui_manager_button'), $panel: $('#trace3d_ui_manager_panel') });

    dataFileLoadeModal = new DataFileLoadModal({ $urlModal: $('#trace3d-file-load-url-modal'), $selectModal: $('#trace3d-file-load-select-modal')});

    structureSelectPanel = new StructureSelectPanel({ container, panel: $('#trace3d_structure_select_panel').get(0) });

    juiceboxPanel = new JuiceboxPanel({ container, panel: $('#trace3d_juicebox_panel').get(0) });

    const juiceboxBrowserConfig =
        {
            container: $('#trace3d_juicebox_root_container'),
            // figureMode: true,
            width: 400,
            height: 400
        };

    let juiceboxBrowser = await juiceboxPanel.createBrowser(juiceboxBrowserConfig);
    juiceboxPanel.defaultConfiguration();

    if (juiceboxBrowser) {
        juiceboxPanel.defaultConfiguration();
    }

    igvPanel = new IGVPanel({ container, panel: $('#trace3d_igv_panel').get(0) });

    const igvBrowserConfig = igvConfigurator();
    igvBrowser = await igvPanel.createBrowser(igvBrowserConfig);

    const sceneManagerConfig = sceneManagerConfigurator(container);
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

                    igvPanel.goto({ chr, start: genomicStart, end: genomicEnd });

                    juiceboxPanel.goto({ chr, start: genomicStart, end: genomicEnd });

                    const initialStructureKey = '0';

                    structure = structureManager.structureWithName(initialStructureKey);

                    igvBrowser.cursorGuide.setCustomMouseHandler(({ bp, start, end, interpolant }) => {
                        mouseHandler({ bp, start, end, interpolant, structureLength: structure.array.length })
                    });

                    structureSelectPanel.configure({ structures: structureManager.structures, initialStructureKey });

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

            const color = sceneManager.colorRampPanel.genomicRampWidget.colorForSegmentIndex(item.segmentIndex);
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
