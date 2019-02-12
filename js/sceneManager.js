import * as THREE from "./threejs_es6/three.module.js";
import { globalEventBus } from "./main.js";

import CubicMapManager from "./cubicMapManager.js";
import {appleCrayonColorHexValue, appleCrayonColorThreeJS} from "./ei_color.js";
import OrbitalCamera from "./orbitalCamera.js";

class SceneManager {

    constructor({ container, scene, renderer }) {


        // scene
        this.scene = scene;

        const specularCubicMapMaterialConfig =
            {
                // textureRoot: 'texture/cubic/specular/aerodynamics_workshop/',
                textureRoot: 'texture/cubic/diagnostic/threejs_format/',
                suffix: '.png',
                isSpecularMap: true
            };

        const specularCubicMapManager = new CubicMapManager(specularCubicMapMaterialConfig);

        // this.scene.background = specularCubicMapManager.cubicTexture;
        this.scene.background = appleCrayonColorThreeJS('mercury');


        // renderer
        this.renderer = renderer;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        this.renderer.setClearColor(appleCrayonColorHexValue('iron'));

        // insert rendering canvas in DOM
        container.appendChild( this.renderer.domElement );

        $(window).on('resize.threejs', () => { this.onWindowResize() });

        globalEventBus.subscribe("DidLoadSegments", this);
        globalEventBus.subscribe("DidLoadTrack", this);
    }

    receiveEvent(event) {

        if ("DidLoadSegments" === event.type) {
            console.log("Neat! " + event.type);
        } else if ("DidLoadTrack" === event.type) {
            console.log("Very cool! " + event.type);
        }

    }

    configureWithSegment({ segment }) {

        const [ extentX, extentY, extentZ ] = segment.extent;

        let dimen = 0.5 * Math.max(extentX, extentY, extentZ);
        dimen = Math.sqrt(dimen*dimen + (2 * dimen*dimen));

        const [ near, far, fov ] = [ 1e-1 * dimen, 32 * dimen, 35 ];
        this.configureOrbitalCamera({ fov, near, far });

        this.poseOrbitalCamera({ position: segment.cameraPosition, lookAt: segment.centroid });

        this.configureGroundPlane({ target: segment.centroid, size: 2 * Math.max(extentX, extentY, extentZ), color: appleCrayonColorHexValue('steel') });

    }

    configureOrbitalCamera({ fov, near, far }) {

        const scene = this.scene;
        const renderer = this.renderer;
        const aspectRatio = window.innerWidth / window.innerHeight;
        const domElement = this.renderer.domElement;
        this.orbitalCamera = new OrbitalCamera({ scene, renderer, fov, near, far, aspectRatio, domElement });

    }

    poseOrbitalCamera( { position, lookAt }) {

        this.orbitalCamera.setPosition(position);

        const [ targetX, targetY, targetZ ] = lookAt;
        this.orbitalCamera.setLookAt(new THREE.Vector3(targetX, targetY, targetZ));

    }

    configureGroundPlane({ target, size, color }) {

        const groundPlane = new THREE.GridHelper(size, 16, color, color);

        const [ targetX, targetY, targetZ ] = target;
        groundPlane.position.set(targetX, targetY, targetZ);

        this.scene.add( groundPlane );

    }

    onWindowResize() {
        this.orbitalCamera.camera.aspect = window.innerWidth / window.innerHeight;
        this.orbitalCamera.camera.updateProjectionMatrix();
        this.renderer.setSize( window.innerWidth, window.innerHeight );
    };

}

export default SceneManager;
