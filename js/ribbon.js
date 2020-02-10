import * as THREE from "../node_modules/three/build/three.module.js";
import EnsembleManager from "./ensembleManager.js";
import {igvPanel, sceneManager} from "./app.js";
import FatLineGeometry from "./threejs_es6/fatlines/fatLineGeometry.js";
import FatLineMaterial from "./threejs_es6/fatlines/fatLineMaterial.js";
import FatLine from "./threejs_es6/fatlines/fatLine.js";
import {getColorListWithXYZList} from "./color.js";
import Noodle, { NoodleScaleFactor } from "./noodle.js";

let fatLineMaterial;

class Ribbon {

    constructor() {
    }

    static getRenderStyle() {
        return 'render-style-ribbon';
    }

    configure(trace) {

        this.dispose();

        this.trace = trace;

        const str = 'Ribbon.configure()';
        console.time(str);

        const vertices = EnsembleManager.getSingleCentroidVerticesWithTrace(trace);
        this.curve = new THREE.CatmullRomCurve3( vertices );
        this.curve.arcLengthDivisions = 1000;

        this.spline = createFatSpline(this.curve, igvPanel.materialProvider);

        console.timeEnd(str);

        // TODO: !!!!!!!!!!!!!!!! THIS IS A HACK !!!!!!!!!!!!!!!!
        if (sceneManager.renderStyle === Noodle.getRenderStyle()) {
            this.show();
        } else {
            this.hide();
        }


    }

    updateMaterialProvider (materialProvider) {

        if (undefined === this.spline) {
            return;
        }

        let colors = getColorListWithXYZList(materialProvider, this.spline.xyzList);
        this.spline.mesh.geometry.setColors( colors );

    }

    addToScene (scene) {
        scene.add( this.spline.mesh );
    }

    renderLoopHelper () {

        if (fatLineMaterial) {
            fatLineMaterial.resolution.set(window.innerWidth, window.innerHeight);
        }

    }

    hide () {
        this.spline.mesh.visible = false;
    }

    show () {
        this.spline.mesh.visible = true;
    }

    dispose () {

        if (this.spline) {
            this.spline.mesh.material.dispose();
            this.spline.mesh.geometry.dispose();
            // [ this.spline.mesh.material, this.spline.mesh.geometry ].forEach(item => item.dispose())
        }

    }

    getBounds() {
        return EnsembleManager.getBoundsWithTrace(this.trace);
    }
}

const createFatSpline = (curve, materialProvider) => {

    const pointCount = getFatSplinePointCount(curve.getLength());

    const str = `createFatSpline. ${ pointCount } vertices and colors.`;
    console.time(str);

    // const xyzList = curve.getPoints( pointCount );
    const xyzList = curve.getSpacedPoints( pointCount );

    let colors = getColorListWithXYZList(materialProvider, xyzList);

    let vertices = [];
    for (let { x, y, z } of xyzList ) {
        vertices.push(x, y, z);
    }

    let fatLineGeometry = new FatLineGeometry();

    fatLineGeometry.setPositions( vertices );
    fatLineGeometry.setColors( colors );

    fatLineMaterial = new FatLineMaterial( { linewidth: /*2*/3, vertexColors: THREE.VertexColors } );

    let mesh = new FatLine(fatLineGeometry, fatLineMaterial);
    mesh.computeLineDistances();
    mesh.scale.set( 1, 1, 1 );
    mesh.name = 'ribbon';

    console.timeEnd(str);

    return { mesh, xyzList };

};

const getFatSplinePointCount = curveLength => {
    return Noodle.getCountMultiplier(curveLength) * NoodleScaleFactor;
};

export default Ribbon;
