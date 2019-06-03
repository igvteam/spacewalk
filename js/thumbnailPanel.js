import * as THREE from "../node_modules/three/build/three.module.js";
import Globals from './globals.js';
import {globalEventBus} from "./eventBus.js";
import { makeDraggable } from "./draggable.js";
import { fitToContainer, moveOffScreen, moveOnScreen } from "./utils.js";
import { appleCrayonColorHexValue, appleCrayonColorThreeJS } from "./color.js";
import { guiManager } from './gui.js';
import Noodle from "./noodle.js";

class ThumbnailPanel {

    constructor ({ container, panel, renderer, material, isHidden }) {

        this.container = container;
        this.$panel = $(panel);

        const $canvas = this.$panel.find('canvas');
        const canvas = $canvas.get(0);

        fitToContainer(canvas, window.devicePixelRatio);

        this.context = canvas.getContext('2d');

        this.canvas = canvas;

        this.material = material;

        // renderer
        const renderContainer = this.$panel.find('#spacewalk_thumbnail_container').get(0);
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

        this.isHidden = isHidden;
        if (isHidden) {
            moveOffScreen(this);
        } else {
            this.layout();
        }

        makeDraggable(panel, this.$panel.find('.spacewalk_card_drag_container').get(0));

        $(window).on('resize.thumbnail_panel', () => { this.onWindowResize(container, panel) });

        globalEventBus.subscribe("ToggleUIControl", this);

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

    receiveEvent({ type, data }) {

        if ("ToggleUIControl" === type && data && data.payload === this.$panel.attr('id')) {

            if (this.isHidden) {
                moveOnScreen(this);
                const model = Globals.sceneManager.renderStyle === Noodle.getRenderStyle() ? Globals.noodle : Globals.ballAndStick;
                this.configure(model);
                this.render();
            } else {
                moveOffScreen(this);
            }
            this.isHidden = !this.isHidden;
        }
    }

    onWindowResize() {
        if (false === this.isHidden) {
            this.layout();
        }
    }

    layout() {

        const { width: cw, height: ch } = this.container.getBoundingClientRect();
        const { width: pw, height: ph } = this.$panel.get(0).getBoundingClientRect();

        const left = cw - 1.1 * pw;
        const  top = ch - 1.1 * ph;

        this.$panel.offset( { left, top } );

    }

}

export let thumbnailPanelConfigurator = (container) => {

    return {
            container,
            panel: $('#spacewalk_thumbnail_panel').get(0),
            renderer: new THREE.WebGLRenderer(),
            material: new THREE.MeshBasicMaterial({ color: appleCrayonColorThreeJS('aqua') }),
            isHidden: guiManager.isPanelHidden('spacewalk_thumbnail_panel')
        };

};

export default ThumbnailPanel;
