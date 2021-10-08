import { EventBus } from 'igv-widgets'
import * as THREE from "three"
import { Line2 } from "three/examples/jsm/lines/Line2.js"
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js"
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js"
import EnsembleManager from "./ensembleManager.js"
import {igvPanel, sceneManager} from "./app.js"
import {appleCrayonColorThreeJS} from "./color.js";

let fatLineMaterial
const ribbonWidth = 4/*2*/
const beadRadiusScalefactor = 1/(6e1)

class Ribbon {

    constructor() {
        EventBus.globalBus.subscribe('DidUpdateGenomicInterpolant', this)
        EventBus.globalBus.subscribe('DidLeaveGenomicNavigator', this)
        EventBus.globalBus.subscribe('DidUpdateColorRampInterpolant', this)
    }

    receiveEvent({ type, data }) {

        if (this.spline && Ribbon.getRenderStyle() === sceneManager.renderStyle) {

            if ('DidLeaveGenomicNavigator' === type) {
                this.beads[ 0 ].visible = this.beads[ 1 ].visible = false
            } else if ('DidUpdateColorRampInterpolant' === type || 'DidUpdateGenomicInterpolant' === type) {

                const { interpolantList } = data

                for (let interpolant of interpolantList) {

                    const { x, y, z } = this.curve.getPointAt(interpolant)
                    const index = interpolantList.indexOf(interpolant)
                    this.beads[ index ].position.set(x, y, z)
                    this.beads[ index ].visible = true
                }

            }

        }

    }

    configure(trace) {

        this.dispose()

        this.trace = trace;

        const str = 'Ribbon.configure()';
        console.time(str);

        const vertices = EnsembleManager.getSingleCentroidVerticesWithTrace(trace);
        this.curve = new THREE.CatmullRomCurve3( vertices );
        this.curve.arcLengthDivisions = 1e3;

        this.spline = createFatSpline(this.curve, igvPanel.materialProvider);

        console.timeEnd(str);

        if (sceneManager.renderStyle === Ribbon.getRenderStyle()) {
            this.show()
        } else {
            this.hide()
        }

    }

    updateMaterialProvider (materialProvider) {

        if (undefined === this.spline) {
            return;
        }

        let colors = getRGBListWithMaterialAndLength(materialProvider, this.spline.xyzList.length);
        this.spline.mesh.geometry.setColors( colors );

    }

    addToScene (scene) {

        scene.add( this.spline.mesh )

        const { center, radius } = EnsembleManager.getBoundsWithTrace(this.trace)

        this.beads = []

        const material = new THREE.MeshPhongMaterial({ color: appleCrayonColorThreeJS('maraschino') })
        const geometry = new THREE.SphereGeometry( radius * beadRadiusScalefactor, 64, 32 )
        this.beads[ 0 ] = new THREE.Mesh( geometry, material )
        this.beads[ 1 ] = new THREE.Mesh( geometry, material )

        scene.add( this.beads[ 0 ] )
        scene.add( this.beads[ 1 ] )

        const { x, y, z } = center
        this.beads[ 0 ].position.set(x, y, z)
        this.beads[ 1 ].position.set(x, y, z)

        this.beads[ 0 ].visible = false
        this.beads[ 1 ].visible = false

    }

    renderLoopHelper () {

        if (fatLineMaterial) {
            fatLineMaterial.resolution.set(window.innerWidth, window.innerHeight);
        }

    }

    hide () {
        this.spline.mesh.visible = false

        if (this.beads) {
            this.beads[ 0 ].visible = false
            this.beads[ 1 ].visible = false
        }
    }

    show () {
        this.spline.mesh.visible = true

        // if (this.beads) {
        //     this.beads[ 0 ].visible = true
        //     this.beads[ 1 ].visible = true
        // }
    }

    dispose () {

        if (this.spline) {
            this.spline.mesh.material.dispose()
            this.spline.mesh.geometry.dispose()
        }

        if (this.beads) {
            for (let { geometry, material } of this.beads) {
                material.dispose()
                geometry.dispose()
            }
        }
    }

    static getCountMultiplier(curveLength) {
        return Math.round( Math.max(1, curveLength / 16000) );
    }

    static getRenderStyle() {
        return 'render-style-ribbon'
    }
}

const createFatSpline = (curve, materialProvider) => {

    const pointCount = getFatSplinePointCount(curve.getLength());

    const str = `createFatSpline. ${ pointCount } vertices and colors.`;
    console.time(str);

    // const xyzList = curve.getPoints( pointCount );
    const xyzList = curve.getSpacedPoints( pointCount );

    let colors = getRGBListWithMaterialAndLength(materialProvider, xyzList.length);

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

const getRGBListWithMaterialAndLength = (materialProvider, length) =>  {

    let rgbList = new Float32Array(length * 3)

    for (let i = 0; i < length; i++) {
        materialProvider.colorForInterpolant(i / (length - 1)).toArray(rgbList, i * 3)
    }

    return rgbList
};

const getFatSplinePointCount = curveLength => {
    return Ribbon.getCountMultiplier(curveLength) * RibbonScaleFactor;
};

export const RibbonScaleFactor = 4e3;

export default Ribbon;
