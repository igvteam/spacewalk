import * as THREE from "../node_modules/three/build/three.module.js";
import { Line2 } from "../node_modules/three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "../node_modules/three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "../node_modules/three/examples/jsm/lines/LineGeometry.js";
import EnsembleManager from "./ensembleManager.js";
import {eventBus, igvPanel, sceneManager} from "./app.js";
import {getColorListWithXYZList} from "./color.js";
import Noodle, { NoodleScaleFactor } from "./noodle.js";

let fatLineMaterial;
const ribbonWidth = 4/*2*/;

class Ribbon {

    constructor() {
        // eventBus.subscribe("DidEnterGenomicNavigator", this);
        // eventBus.subscribe("DidLeaveGenomicNavigator", this);
    }

    receiveEvent({ type, data }) {

        if (sceneManager.renderStyle === Noodle.getRenderStyle()) {

            if ("DidEnterGenomicNavigator" === type) {
                this.show();
            } else if ("DidLeaveGenomicNavigator" === type) {
                this.hide();
            }

        }
    }

    configure(trace) {

        this.dispose();

        this.trace = trace;

        const str = 'Ribbon.configure()';
        console.time(str);

        const vertices = EnsembleManager.getSingleCentroidVerticesWithTrace(trace);
        this.curve = new THREE.CatmullRomCurve3( vertices );
        this.curve.arcLengthDivisions = 1e3;

        this.spline = createFatSpline(this.curve, igvPanel.materialProvider);

        console.timeEnd(str);

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

    static getRenderStyle() {
        return 'render-style-ribbon';
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

    let fatLineGeometry = new LineGeometry();

    fatLineGeometry.setPositions( vertices );
    fatLineGeometry.setColors( colors );

    fatLineMaterial = new LineMaterial( { linewidth: ribbonWidth, vertexColors: true } );

    let mesh = new Line2(fatLineGeometry, fatLineMaterial);
    mesh.computeLineDistances();
    mesh.scale.set( 1, 1, 1 );
    mesh.name = 'ribbon';

    console.timeEnd(str);

    return { mesh, xyzList };

};

export const RibbonScaleFactor = 4e3;

const getFatSplinePointCount = curveLength => {
    return Noodle.getCountMultiplier(curveLength) * RibbonScaleFactor;
};

export default Ribbon;
