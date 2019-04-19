import * as THREE from './threejs_es6/three.module.js';
import { globalEventBus } from './eventBus.js';
import GUIManager from './guiManager.js';
import SceneManager from './sceneManager.js';
import DataFileLoadModal from './dataFileLoadModal.js';
import StructureSelectPanel from './structureSelectPanel.js';
import StructureManager from './structureManager.js';
import IGVPanel from './IGVPanel.js';
import JuiceboxPanel from './juiceboxPanel.js';

import { juiceboxMouseHandler } from './juiceboxPanel.js'
import { IGVMouseHandler, igvConfigurator } from './IGVPanel.js';
import { sceneManagerConfigurator } from './sceneManager.js';
import { appleCrayonColorHexValue } from './color.js';
import { showSTMaterial, showSMaterial, showTMaterial } from './materialLibrary.js';

let guiManager;

let structureManager;

let structureSelectPanel;

let dataFileLoadeModal;

let igvPanel;
let igvBrowser;

let juiceboxPanel;

let sceneManager;

let doUpdateCameraPose = true;

let rgbTexture;
let alphaTexture;

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
                        IGVMouseHandler({bp, start, end, interpolant, structureLength: structure.array.length})
                    });

                    juiceboxBrowser.setCustomCrosshairsHandler(({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY }) => {
                        juiceboxMouseHandler({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY, structureLength: structure.array.length });
                    });

                    sceneManager.dispose();

                    structureManager.parsePathEncodedGenomicLocation(structureManager.path);

                    const { chr, genomicStart, genomicEnd } = structureManager.locus;
                    setup({ chr, genomicStart, genomicEnd, structure });

                } else if ('DidLoadFile' === type) {

                    let { name, payload } = data;

                    $('.navbar').find('#trace3d-file-name').text(name);

                    structureManager.path = name;
                    structureManager.ingest(payload);

                    structureManager.parsePathEncodedGenomicLocation(structureManager.path);

                    const { chr, genomicStart, genomicEnd } = structureManager.locus;

                    igvPanel.goto({ chr, start: genomicStart, end: genomicEnd });

                    juiceboxPanel.goto({ chr, start: genomicStart, end: genomicEnd });

                    const initialStructureKey = '0';

                    structure = structureManager.structureWithName(initialStructureKey);

                    igvBrowser.cursorGuide.setCustomMouseHandler(({ bp, start, end, interpolant }) => {
                        IGVMouseHandler({bp, start, end, interpolant, structureLength: structure.array.length})
                    });

                    juiceboxBrowser.setCustomCrosshairsHandler(({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY }) => {
                        juiceboxMouseHandler({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY, structureLength: structure.array.length });
                    });

                    structureSelectPanel.configure({ structures: structureManager.structures, initialStructureKey });

                    sceneManager.dispose();

                    setup({ chr, genomicStart, genomicEnd, structure });

                    doUpdateCameraPose = false;

                } else if ('ToggleAllUIControls' === type) {
                    // $('.navbar').toggle();
                }

            }
        };

    globalEventBus.subscribe('DidSelectStructure', eventListener);
    globalEventBus.subscribe('DidLoadFile', eventListener);
    globalEventBus.subscribe('ToggleAllUIControls', eventListener);
};

let setup = ({ chr, genomicStart, genomicEnd, structure }) => {

    let [ structureLength, structureExtent, cameraPosition, structureCentroid ] = [ structure.array.length, structure.extent, structure.cameraPosition, structure.centroid ];

    sceneManager.configure({ chr, genomicStart, genomicEnd, structureLength, structureExtent, cameraPosition, structureCentroid, doUpdateCameraPose });

    let { canvas, alphamap_canvas } = sceneManager.colorRampPanel.colorRampWidget;
    drawTube(structure.array, canvas, alphamap_canvas);

    drawSpline(structure.array, sceneManager.colorRampPanel.colorRampWidget);

    // drawBall(structure.array);
    // drawStick(structure.array);
};

let drawTube = (structureList, rgb_canvas, alphamap_canvas) => {

    const knots = structureList.map((obj) => {
        let [ x, y, z ] = obj.xyz;
        return new THREE.Vector3( x, y, z );
    });

    const axis = new THREE.CatmullRomCurve3(knots);
    const tubeGeometry = new THREE.TubeBufferGeometry(axis, 1024, sceneManager.ballRadius, 96, false);

    rgbTexture = new THREE.CanvasTexture(rgb_canvas);
    rgbTexture.center.set(0.5, 0.5);
    rgbTexture.rotation = Math.PI/2.0;
    rgbTexture.minFilter = rgbTexture.magFilter = THREE.NearestFilter;

    alphaTexture = new THREE.CanvasTexture(alphamap_canvas);
    alphaTexture.center.set(0.5, 0.5);
    alphaTexture.rotation = Math.PI/2.0;
    alphaTexture.minFilter = alphaTexture.magFilter = THREE.NearestFilter;

    let tubeMaterial = new THREE.MeshPhongMaterial({ map: rgbTexture, alphaMap: alphaTexture });
    tubeMaterial.alphaTest = 0.5;
    tubeMaterial.side = THREE.DoubleSide;
    tubeMaterial.transparent = true;

    // let tubeMaterial = sceneManager.stickMaterial.clone();
    const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
    tubeMesh.name = 'tube';

    sceneManager.scene.add( tubeMesh );

};

let drawSpline = (structureList, colorRampWidget) => {

    const knots = structureList.map((obj) => {
        let [ x, y, z ] = obj.xyz;
        return new THREE.Vector3( x, y, z );
    });

    const curve = new THREE.CatmullRomCurve3(knots);

    const howmany = 2048;
    const vertices = curve.getPoints( howmany );

    const colors = vertices.map((vertex, index) => {

        let interpolant = index / (vertices.length - 1);

        // flip direction
        interpolant = 1 - interpolant;

        return colorRampWidget.colorForInterpolant(interpolant);
    });

    const geometry = new THREE.Geometry();
    geometry.vertices = vertices;
    geometry.colors = colors;

    const material = new THREE.LineBasicMaterial( { vertexColors: THREE.VertexColors } );

    const line = new THREE.Line( geometry, material );

    sceneManager.scene.add( line );

};

let drawBall = (structureList) => {

    for(let structure of structureList) {

        const index = structureList.indexOf(structure);

        const [ x, y, z ] = structure.xyz;

        const color = sceneManager.colorRampPanel.colorRampWidget.colorForInterpolant(index / (structureList.length - 1));

        // const ballMaterial = new THREE.MeshPhongMaterial({ color, envMap: specularCubicTexture });
        const ballMaterial = new THREE.MeshPhongMaterial({ color });
        // const ballMaterial = new THREE.MeshBasicMaterial({ color });
        // const ballMaterial = showTMaterial;
        const ballMesh = new THREE.Mesh(sceneManager.ballGeometry, ballMaterial);
        ballMesh.position.set(x, y, z);

        const genomicLocation = index * structureManager.stepSize + structureManager.locus.genomicStart;

        sceneManager.genomicLocationObjectDictionary[ genomicLocation.toString() ] = { object: ballMesh, centroid: ballMesh.position.clone() };

        sceneManager.indexDictionary[ ballMesh.uuid ] = { index, genomicLocation };

        sceneManager.objectList[ index ] = { object: ballMesh, genomicLocation };

        sceneManager.scene.add(ballMesh);

    }

};

let drawStick = (structureList) => {

    for (let i = 0, j = 1; j < structureList.length; ++i, ++j) {

        const [ x0, y0, z0 ] = structureList[i].xyz;
        const [ x1, y1, z1 ] = structureList[j].xyz;

        const axis = new THREE.CatmullRomCurve3([ new THREE.Vector3( x0, y0, z0 ), new THREE.Vector3( x1, y1, z1 ) ]);
        const stickGeometry = new THREE.TubeBufferGeometry(axis, 8, sceneManager.ballRadius/8, 16, false);

        const stickMaterial = sceneManager.stickMaterial.clone();
        const stickMesh = new THREE.Mesh(stickGeometry, stickMaterial);
        stickMesh.name = 'stick';

        sceneManager.scene.add( stickMesh );

    }

};

let renderLoop = () => {

    requestAnimationFrame( renderLoop );

    if (sceneManager.scene && sceneManager.orbitalCamera) {

        if (rgbTexture) {
            rgbTexture.needsUpdate = true;
            alphaTexture.needsUpdate = true;
        }

        sceneManager.renderer.render(sceneManager.scene, sceneManager.orbitalCamera.camera);
    }

};

export { main, sceneManager, structureManager };
