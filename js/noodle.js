import * as THREE from "./threejs_es6/three.module.js";
import FatLineGeometry from "./threejs_es6/fatlines/fatLineGeometry.js";
import FatLineMaterial from "./threejs_es6/fatlines/fatLineMaterial.js";
import FatLine from "./threejs_es6/fatlines/fatLine.js";
import { sceneManager } from "./main.js";
import { degrees } from './math.js';

let rgbTexture;
let alphaTexture;
let fatLineMaterial;

class Noodle {

    constructor () {
    }

    static getRenderStyle() {
        return 'render-style-noodle';
    }

    configure(structure, colorRampWidget, renderStyle) {

        this.dispose();

        let { rgb_ctx, alphamap_ctx } = colorRampWidget;

        this.tube = this.createTube(structure, rgb_ctx.canvas, alphamap_ctx.canvas);

        this.spline = this.createFatSpline(structure, colorRampWidget);

        if (renderStyle === Noodle.getRenderStyle()) {
            this.show();
        } else {
            this.hide();
        }

    }

    createTube(structure, rgb_canvas, alphamap_canvas) {

        const knots = structure.map((obj) => {
            let [ x, y, z ] = obj.xyz;
            return new THREE.Vector3( x, y, z );
        });

        const axis = new THREE.CatmullRomCurve3(knots);
        const geometry = new THREE.TubeBufferGeometry(axis, 1024, sceneManager.ballRadius, 96, false);

        rgbTexture = new THREE.CanvasTexture(rgb_canvas);
        rgbTexture.center.set(0.5, 0.5);
        rgbTexture.rotation = Math.PI/2.0;
        rgbTexture.minFilter = rgbTexture.magFilter = THREE.NearestFilter;

        alphaTexture = new THREE.CanvasTexture(alphamap_canvas);
        alphaTexture.center.set(0.5, 0.5);
        alphaTexture.rotation = Math.PI/2.0;
        alphaTexture.minFilter = alphaTexture.magFilter = THREE.NearestFilter;

        let material = new THREE.MeshPhongMaterial({ map: rgbTexture, alphaMap: alphaTexture });
        material.alphaTest = 0.5;
        material.side = THREE.DoubleSide;
        material.transparent = true;

        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = 'noodle';

        return { mesh, textures: [ rgbTexture, alphaTexture ] };

    };

    createFatSpline(structure, colorRampWidget){

        const knots = structure.map((obj) => {
            let [ x, y, z ] = obj.xyz;
            return new THREE.Vector3( x, y, z );
        });

        const curve = new THREE.CatmullRomCurve3(knots);

        const howmany = 2048;

        const xyzList = curve.getPoints( howmany );

        const rgbList = xyzList.map((xyz, index) => {
            let interpolant = index / (xyzList.length - 1);
            interpolant = 1 - interpolant;
            return colorRampWidget.colorForInterpolant(interpolant);
        });

        let vertices = [];
        xyzList.forEach((xyz) => {
            const { x, y, z } = xyz;
            vertices.push(x, y, z);
        });

        let colors = [];
        rgbList.forEach((rgb) => {
            const { r, g, b } = rgb;
            colors.push(r, g, b);
        });

        let geometry = new FatLineGeometry();
        geometry.setPositions( vertices );
        geometry.setColors( colors );

        fatLineMaterial = new FatLineMaterial( { linewidth: 2, vertexColors: THREE.VertexColors } );

        let mesh = new FatLine(geometry, fatLineMaterial);
        mesh.computeLineDistances();
        mesh.scale.set( 1, 1, 1 );
        mesh.name = 'noodle_spline';

        return { mesh };

    };

    addToScene (scene) {
        scene.add( this.tube.mesh );
        scene.add( this.spline.mesh );
    }

    renderLoopHelper () {

        if (rgbTexture) {
            rgbTexture.needsUpdate = true;
        }

        if (alphaTexture) {
            alphaTexture.needsUpdate = true;
        }

        if (fatLineMaterial) {
            fatLineMaterial.resolution.set(window.innerWidth, window.innerHeight);
        }

    }

    hide () {
        this.tube.mesh.visible = this.spline.mesh.visible = false;
    }

    show () {
        this.tube.mesh.visible = this.spline.mesh.visible = true;
    }

    dispose () {

        if (this.tube) {

            let { material, geometry } = this.tube.mesh;
            let { textures } = this.tube;

            [ material, geometry ].forEach(item => item.dispose());
            textures.forEach(t => t.dispose())
        }

        if (this.spline) {

            let { material, geometry } = this.spline.mesh;

            [ material, geometry ].forEach(item => item.dispose())
        }

    }

    getThumbnailGeometryList () {
        return [ this.tube.mesh.geometry ];
    }

    getBounds() {

        let { geometry } = this.tube.mesh;

        geometry.computeBoundingSphere();
        const { center, radius } = geometry.boundingSphere;

        geometry.computeBoundingBox();
        const { min, max } = geometry.boundingBox;

        return { min, max, center, radius }
    }

    getCameraPoseAlongAxis ({ axis, scaleFactor }) {

        const { center, radius } = this.getBounds();

        const dimen = scaleFactor * radius;

        const theta = Math.atan(radius/dimen);
        const fov = degrees( 2 * theta);

        const axes =
            {
                '-x': () => {
                    return new THREE.Vector3(-dimen, 0, 0);
                },
                '+x': () => {
                    return new THREE.Vector3(dimen, 0, 0);
                },
                '-y': () => {
                    return new THREE.Vector3(0, -dimen, 0);
                },
                '+y': () => {
                    return new THREE.Vector3(0, dimen, 0);
                },
                '-z': () => {
                    return new THREE.Vector3(0, 0, -dimen);
                },
                '+z': () => {
                    return new THREE.Vector3(0, 0, dimen);
                },
            };

        const vector = axes[ axis ]();
        let position = new THREE.Vector3();

        position.addVectors(center, vector);

        return { target:center, position, fov }
    }

}

let createThinSpline = (structure, colorRampWidget) => {

    const knots = structure.map((obj) => {
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

export default Noodle;
