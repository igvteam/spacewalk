import * as THREE from './threejs_es6/three.module.js';
import { makeDraggable } from "./draggable.js";
import { fitToContainer } from "./utils.js";
import { appleCrayonColorHexValue, appleCrayonColorThreeJS } from "./color.js";
import MeshModel from './meshModel.js';
import {ballAndStick} from "./main";

const [ fov, near, far ] = [ 40, 1e-1, 7e2 ];

let doRender = true;
class ThumbnailPanel {

    constructor ({ container, palette, renderer, model, material }) {

        const $canvas = $(palette).find('canvas');
        const canvas = $canvas.get(0);

        fitToContainer(canvas, window.devicePixelRatio);

        this.context = canvas.getContext('2d');

        this.canvas = canvas;

        // renderer
        const renderContainer = $(palette).find('#trace3d_thumbnail_container').get(0);
        const { width: renderWidth, height: renderHeight } = renderContainer.getBoundingClientRect();

        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(renderWidth, renderHeight);

        renderer.setClearColor(appleCrayonColorHexValue('sky'));

        this.renderer = renderer;

        // camera
        this.camera = new THREE.PerspectiveCamera(fov, renderWidth / renderHeight, near, far);

        const { target, position } = model.getCameraPoseAlongAxis('-z');
        this.camera.position.copy(position);
        this.camera.lookAt( target );

        // scene
        this.scene = new THREE.Scene();
        this.scene.background = appleCrayonColorThreeJS('sky');

        this.mesh = new THREE.Mesh(model.geometry, material);
        this.scene.add(this.mesh);

        layout(container, palette);

        makeDraggable(palette, $(palette).find('.trace3d_card_drag_container').get(0));

        $(window).on('resize.thumbnail_palette', () => { this.onWindowResize(container, palette) });

    }

    configure ({ model, position, target, extent }) {

        let { camera } = this;

        camera.lookAt(target);

        const { x, y, z } = position;
        camera.position.set(x, y, z);

        const [ fov, near, far, aspect ] = [ 35, 1e-1 * extent, 32 * extent, 1 ];

        camera.fov = fov;
        camera.near = near;
        camera.far = far;
        camera.aspect = aspect;

        camera.updateProjectionMatrix();

        // TODO: Scene disposal and all it's contents.
        // TODO: Derive camera pose from model - add bbox method and camera pose method to model
        return;

        this.mesh = new THREE.Mesh(model.geometry, material);
        this.scene.add(this.mesh);

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

        this.scene.remove( this.mesh );
        // geometry.dispose();
        // material.dispose();
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
