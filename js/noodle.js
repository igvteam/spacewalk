import * as THREE from "./threejs_es6/three.module.js";
import FatLineGeometry from "./threejs_es6/fatlines/fatLineGeometry.js";
import FatLineMaterial from "./threejs_es6/fatlines/fatLineMaterial.js";
import FatLine from "./threejs_es6/fatlines/fatLine.js";
import { sceneManager } from "./main.js";

let rgbTexture;
let alphaTexture;
let fatLineMaterial;

class Noodle {

    constructor () {
        this.dictionary = {};
    }

    configure (structureList, colorRampWidget) {

        let { rgb_ctx, alphamap_ctx } = colorRampWidget;

        this.tube = createTube(structureList, rgb_ctx.canvas, alphamap_ctx.canvas);

        this.spline = createFatSpline(structureList, colorRampWidget);
        // his.spline = createThinSpline(structureList, colorRampWidget);

    }

    addToScene (scene) {
        scene.add( this.tube );
        scene.add( this.spline );
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

    }

    show () {

    }


}


let createTube = (structureList, rgb_canvas, alphamap_canvas) => {

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
    tubeMesh.name = 'noodle';

    return tubeMesh;

};

let createFatSpline = (structureList, colorRampWidget) => {

    const knots = structureList.map((obj) => {
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

    let fatLineGeometry = new FatLineGeometry();
    fatLineGeometry.setPositions( vertices );
    fatLineGeometry.setColors( colors );

    fatLineMaterial = new FatLineMaterial( { linewidth: 2, vertexColors: THREE.VertexColors } );

    let fatLine = new FatLine(fatLineGeometry, fatLineMaterial);
    fatLine.computeLineDistances();
    fatLine.scale.set( 1, 1, 1 );
    fatLine.name = 'noodle_spline';

    return fatLine;

};

let createThinSpline = (structureList, colorRampWidget) => {

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

export default Noodle;
