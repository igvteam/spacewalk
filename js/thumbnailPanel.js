import * as THREE from './threejs_es6/three.module.js';
import { makeDraggable } from "./draggable.js";
import { fitToContainer } from "./utils.js";
import { appleCrayonColorHexValue, appleCrayonColorThreeJS } from "./color.js";
import MeshModel from './meshModel.js';

let doRender = true;
class ThumbnailPanel {

    constructor ({ container, palette, renderer, material }) {

        const $canvas = $(palette).find('canvas');
        const canvas = $canvas.get(0);

        fitToContainer(canvas, window.devicePixelRatio);

        this.context = canvas.getContext('2d');

        this.canvas = canvas;

        this.material = material;

        // renderer
        const renderContainer = $(palette).find('#trace3d_thumbnail_container').get(0);
        const { width: renderWidth, height: renderHeight } = renderContainer.getBoundingClientRect();

        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(renderWidth, renderHeight);
        renderer.setClearColor(appleCrayonColorHexValue('sky'));
        this.renderer = renderer;

        // camera
        this.camera = new THREE.PerspectiveCamera(15, 1, 1e-1, 1e3);

        // scene
        this.scene = new THREE.Scene();
        this.scene.background = appleCrayonColorThreeJS('sky');

        this.meshList = [];

        layout(container, palette);

        makeDraggable(palette, $(palette).find('.trace3d_card_drag_container').get(0));

        $(window).on('resize.thumbnail_palette', () => { this.onWindowResize(container, palette) });

    }

    configure ({ model, target, position, boundingRadius }) {

        this.dispose();

        let meshModel = undefined;
        model.getThumbnailGeometryList().forEach((geometry) => {

            geometry.computeBoundingBox();
            const { min, max } = geometry.boundingBox;

            const { x:mx, y:my, z:mz } = min;
            const { x:Mx, y:My, z:Mz } = max;
            const [ sx, sy, sz ] = [ Mx - mx, My - my, Mz - mz ];

            const boxBufferGeometry = new THREE.BoxBufferGeometry( sx, sy, sz, 4, 4, 4 );

            const [ tx, ty, tz ] = [ (Mx+mx)/2, (My+my)/2, (Mz+mz)/2 ];
            boxBufferGeometry.translate(tx, ty, tz);

            meshModel = new MeshModel({ sx, sy, sz, geometry: boxBufferGeometry, material: this.material });

            const mesh = new THREE.Mesh(meshModel.geometry, meshModel.material);

            // const mesh = new THREE.Mesh(geometry, this.material);

            this.scene.add(mesh);
            this.meshList.push(mesh);
        });

        const { target: tt, position: pp } = meshModel.getNiceCameraPose();
        this.camera.lookAt(tt);
        this.camera.position.copy(pp);

        const extent = 2 * boundingRadius;
        const [ fov, near, far, aspect ] = [ 4, 5e-2 * extent, 2e1 * extent, 1 ];
        this.camera.fov = fov;
        this.camera.near = near;
        this.camera.far = far;
        this.camera.aspect = aspect;

        // this.camera.updateMatrixWorld();
        // this.camera.updateProjectionMatrix();

    }

    render () {

        const { scene, camera } = this;
        this.renderer.render( scene, camera );

        const { domElement: renderCanvas } = this.renderer;

        const { width: rw, height: rh } = renderCanvas;
        const { width:  w, height:  h } = this.canvas;

        // origin is at north-west corner of canvas: x-east, y-south
        this.context.drawImage(renderCanvas, 0, 0, rw, rh, 0, 0, w, h);

    }

    dispose () {

        if (this.meshList.length > 0) {
            this.meshList.forEach(mesh => this.scene.remove(mesh));
        }

        this.meshList = [];
    }

    onWindowResize(container, palette) {
        layout(container, palette);
    }

}

export let thumbnailPanelConfigurator = (container) => {

    return {
            container,
            palette: $('#trace3d_thumbnail_panel').get(0),
            renderer: new THREE.WebGLRenderer(),
            material: new THREE.MeshBasicMaterial({ color: appleCrayonColorThreeJS('salmon') })
        };

};

let layout = (container, palette) => {

    const { width: cw, height: ch } = container.getBoundingClientRect();
    const { width: pw, height: ph } = palette.getBoundingClientRect();

    const left = cw - 1.1 * pw;
    const  top = ch - 1.1 * ph;

    $(palette).offset( { left, top } );

};

export default ThumbnailPanel;
