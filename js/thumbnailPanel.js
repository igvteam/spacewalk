import * as THREE from './threejs_es6/three.module.js';
import { makeDraggable } from "./draggable.js";
import { fitToContainer } from "./utils.js";
import { appleCrayonColorHexValue, appleCrayonColorThreeJS } from "./color.js";

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
        renderer.setClearColor(appleCrayonColorHexValue('snow'));
        this.renderer = renderer;

        this.renderWidth = renderWidth;
        this.renderHeight = renderHeight;

        // scene
        this.scene = new THREE.Scene();
        this.scene.background = appleCrayonColorThreeJS('snow');

        this.meshList = [];

        layout(container, palette);

        makeDraggable(palette, $(palette).find('.trace3d_card_drag_container').get(0));

        $(window).on('resize.thumbnail_palette', () => { this.onWindowResize(container, palette) });

    }

    configure (model) {

        this.dispose();

        model.getThumbnailGeometryList().forEach((geometry) => {
            let mesh = new THREE.Mesh(geometry, this.material);
            this.scene.add(mesh);
            this.meshList.push(mesh);
        });

        const { target, position, fov } = model.getCameraPoseAlongAxis({ axis: '+z', scaleFactor: 3.5 });

        const { radius } = model.getBounds();
        const extent = 2 * radius;
        const [ near, far, aspect ] = [ 1e-2 * extent, 1e1 * extent, this.renderWidth / this.renderHeight ];

        // camera - fov, aspect, near, far
        this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

        this.camera.position.copy(position);
        this.camera.lookAt(target);

    }

    render () {

        this.renderer.render( this.scene, this.camera );

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
            material: new THREE.MeshBasicMaterial({ color: appleCrayonColorThreeJS('aqua') })
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
