import * as THREE from './threejs_es6/three.module.js';
import { makeDraggable } from "./draggable.js";
import { fitToContainer } from "./utils.js";
import { appleCrayonColorHexValue, appleCrayonColorThreeJS } from "./color.js";
import MeshModel from './meshModel.js';

const [ fov, near, far ] = [ 40, 1e-1, 7e2 ];

let doRender = true;
class ThumbnailPanel {

    constructor ({ container, palette, renderer, model, material }) {

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
        this.camera = new THREE.PerspectiveCamera(fov, renderWidth / renderHeight, near, far);

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

        let { camera } = this;

        camera.lookAt(target);
        camera.position.copy(position);

        const extent = 2 * boundingRadius;
        const [ fov, near, far, aspect ] = [ 35, 1e-1 * extent, 1e1 * extent, 1 ];

        camera.fov = fov;
        camera.near = near;
        camera.far = far;
        camera.aspect = aspect;

        camera.updateProjectionMatrix();

        model.getThumbnailGeometryList().forEach((geometry) => {
            const mesh = new THREE.Mesh(geometry, this.material);
            this.scene.add(mesh);
            this.meshList.push(mesh);
        });

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

let poseCamera = (camera, target, toCamera) => {

    // TODO: Refer to sceneManager.configure for details

    camera.lookAt(target);

    const { x, y, z } = target.clone().add(toCamera);
    camera.position.set(x, y, z);


    const [ fov, near, far, aspect ] = [ 35, 1e-1 * dimen, 32 * dimen, 1 ];

    camera.fov = fov;
    camera.near = near;
    camera.far = far;
    camera.aspect = aspect;

    camera.updateProjectionMatrix();


};

let boxGeometry;

export let thumbnailPanelConfigurator = (container) => {

    const dimen = 16;
    const [ sx, sy, sz, tessx, tessy, tessz ] = [ dimen, dimen/4, dimen/2, 4, 4, 4 ];
    boxGeometry = new THREE.BoxBufferGeometry( sx, sy, sz, tessx, tessy, tessz );

    return {
            container,
            palette: $('#trace3d_thumbnail_panel').get(0),
            renderer: new THREE.WebGLRenderer(),
            model: new MeshModel({ sx, sy, sz, geometry: boxGeometry, material: new THREE.MeshBasicMaterial({ color: appleCrayonColorThreeJS('salmon') }) }),
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
