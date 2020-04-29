import * as THREE from "../node_modules/three/build/three.module.js";
import { BufferGeometryUtils } from '../node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';
import { StringUtils } from '../node_modules/igv-utils/src/index.js'
import { clamp } from './math.js';
import EnsembleManager from "./ensembleManager.js";
import { generateRadiusTable } from "./utils.js";
import { sceneManager, igvPanel } from './app.js'
import { instanceColorString } from "./sceneManager.js";
import {appleCrayonColorThreeJS} from "./color";

let ballRadiusIndex = undefined;
let ballRadiusTable = undefined;

let stickRadiusIndex = undefined;
let stickRadiusTable = undefined;

const stickTesselation = { length: 2, radial: 8 }

class BallAndStick {

    constructor () {
        this.stickCurves = undefined;
    }

    configure(trace) {

        this.dispose();

        this.trace = trace;

        if (undefined === this.stickCurves) {
            this.stickCurves = createStickCurves(EnsembleManager.getSingleCentroidVerticesWithTrace(trace));
        }

        const averageCurveDistance  = computeAverageCurveDistance(this.stickCurves);
        console.log(`Ball&Stick. Average Curve Distance ${StringUtils.numberFormatter(Math.round(averageCurveDistance)) }`);

        stickRadiusTable = generateRadiusTable(0.5e-1 * averageCurveDistance);
        stickRadiusIndex = Math.floor( stickRadiusTable.length/2 );
        this.sticks = this.createSticks(this.stickCurves, stickRadiusTable[ stickRadiusIndex ]);

        ballRadiusTable = generateRadiusTable(2e-1 * averageCurveDistance);
        ballRadiusIndex = Math.floor( ballRadiusTable.length/2 );
        this.balls = this.createBalls(trace, ballRadiusTable[ ballRadiusIndex ]);

        if (sceneManager.renderStyle === BallAndStick.getRenderStyle()) {
            this.show();
        } else {
            this.hide();
        }
    }

    createBalls(trace, ballRadius) {

        this.colorRampInterpolantWindowDictionary = {};

        // canonical geometry (ball)
        const geometry = new THREE.SphereBufferGeometry(1, 32, 16);

        const vertices = EnsembleManager.getSingleCentroidVerticesWithTrace(trace);

        // build rgb list
        const rgb = [];
        for (let i = 0; i < vertices.length; i++) {
            const { interpolant } = trace[ i ].colorRampInterpolantWindow;
            const { r, g, b } = igvPanel.materialProvider.colorForInterpolant(interpolant);
            rgb.push(r);
            rgb.push(g);
            rgb.push(b);

            this.colorRampInterpolantWindowDictionary[ i.toString() ] = trace[ i ].colorRampInterpolantWindow;

        }

        // assign instance color list to canonical geometry
        geometry.setAttribute(instanceColorString, new THREE.InstancedBufferAttribute(new Float32Array(rgb), 3) );

        // custom instance material
        const material = getMaterialWithInstanceColorString(instanceColorString);

        // Instance mesh
        const mesh = new THREE.InstancedMesh(geometry, material, vertices.length);
        mesh.name = 'ball';

        // layout each instance of the mesh
        const proxy = new THREE.Object3D();
        vertices.forEach((vertex, i) => {

            const { x, y, z } = vertex
            proxy.position.set(x, y, z);

            proxy.scale.setScalar(ballRadius);

            proxy.updateMatrix();

            mesh.setMatrixAt(i++, proxy.matrix);
        });

        return mesh;

    }

    createSticks(curves, stickRadius) {
        const geometries = curves.map(curve => new THREE.TubeBufferGeometry(curve, stickTesselation.length, stickRadius, stickTesselation.radial, false));
        const material = sceneManager.stickMaterial.clone();
        const mesh = new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries( geometries ), material);
        mesh.name = 'stick';
        return mesh;
    }

    addToScene (scene) {
        scene.add(this.balls);
        scene.add(this.sticks);
    }

    hide () {
        this.balls.visible = false
        this.sticks.visible = false;
    }

    show () {
        this.balls.visible = true
        this.sticks.visible = true
    }

    updateBallRadius(increment) {

        ballRadiusIndex = clamp(ballRadiusIndex + increment, 0, ballRadiusTable.length - 1);
        const radius = ballRadiusTable[ ballRadiusIndex ];

        for (let mesh of this.balls) {
            mesh.scale.setScalar(radius);
        }

    }

    updateStickRadius(increment) {
        stickRadiusIndex = clamp(stickRadiusIndex + increment, 0, stickRadiusTable.length - 1);
        const radius = stickRadiusTable[ stickRadiusIndex ];
        const geometries = this.stickCurves.map(curve => new THREE.TubeBufferGeometry(curve, stickTesselation.length, radius, stickTesselation.radial, false));
        this.sticks.geometry.copy(BufferGeometryUtils.mergeBufferGeometries( geometries ));
    }

    updateMaterialProvider (materialProvider) {

        if (undefined === this.balls) {
            return;
        }

        // TODO: ballAndStick.updateMaterialProvider. Handle instanced mesh.
        console.log('TODO: ballAndStick.updateMaterialProvider. Handle instanced mesh.');

        for (let { interpolant } of this.colorRampInterpolantWindowDictionary) {
            const color = materialProvider.colorForInterpolant(interpolant);
            // do something with this color
        }

        // this.balls.forEach(mesh => {
        //
        //     const { interpolant } = this.colorRampInterpolantWindowDictionary[ mesh.uuid ];
        //
        //     const color = materialProvider.colorForInterpolant(interpolant);
        //
        //     mesh.material = new THREE.MeshPhongMaterial({ color });
        // });
    }

    dispose () {

        if (this.balls) {
            this.balls.geometry.dispose();
            this.balls.material.dispose();
        }

        if (this.sticks) {
            this.sticks.geometry.dispose();
            this.sticks.material.dispose();
        }

        delete this.stickCurves;
    }

    getBounds() {
        return EnsembleManager.getBoundsWithTrace(this.trace);
    }

    static getRenderStyle() {
        return 'render-style-ball-stick';
    }
}

const getMaterialWithInstanceColorString = (str) => {

    const material = new THREE.MeshPhongMaterial({ color: appleCrayonColorThreeJS('snow') });

    material.onBeforeCompile = shader => {

        const colorParsChunk =
            [
                `attribute vec3 ${ str };`,
                `varying vec3 v_${ str };`,
                '#include <common>'
            ].join( '\n' );

        const instanceColorChunk =
            [
                '#include <begin_vertex>',
                `v_${ str } = ${ str };`
            ].join( '\n' );

        shader.vertexShader = shader.vertexShader
            .replace( '#include <common>', colorParsChunk )
            .replace( '#include <begin_vertex>', instanceColorChunk );

        const fragmentParsChunk =
            [
                `varying vec3 v_${ str };`,
                '#include <common>'
            ].join( '\n' );

        const colorChunk =
            [
                `vec4 diffuseColor = vec4( diffuse * v_${ str }, opacity );`
            ].join( '\n' );

        shader.fragmentShader = shader.fragmentShader
            .replace( '#include <common>', fragmentParsChunk )
            .replace( 'vec4 diffuseColor = vec4( diffuse, opacity );', colorChunk );

    };

    return material;
}

export const computeAverageCurveDistance = curves => {

    let acc = 0;
    const sum = curves
        .reduce((accumulator, curve) => {
            accumulator += curve.getLength();
            return accumulator;
        }, acc);

    return sum / curves.length;

};

export const createStickCurves = (vertices) => {

    let curves = [];
    for (let i = 0, j = 1; j < vertices.length; ++i, ++j) {
        curves.push( new THREE.CatmullRomCurve3([ vertices[i], vertices[j] ]) );
    }

    return curves;
};

let setVisibility = (objects, isVisible) => {
    objects.forEach(object => object.visible = isVisible);
};

export default BallAndStick;
