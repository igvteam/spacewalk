import * as THREE from "three"
import SpacewalkEventBus from './spacewalkEventBus.js'
import { Line2 } from "three/examples/jsm/lines/Line2.js"
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js"
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js"
import EnsembleManager, { getSingleCentroidVertices } from "./ensembleManager.js"
import {igvPanel, sceneManager} from "./app.js"
import {appleCrayonColorThreeJS} from "./color.js";

const ribbonWidth = 4/*2*/
const highlightBeadRadiusScalefactor = 1/(6e1)

class Ribbon {

    constructor() {
        SpacewalkEventBus.globalBus.subscribe('DidUpdateGenomicInterpolant', this)
        SpacewalkEventBus.globalBus.subscribe('DidLeaveGenomicNavigator', this)
    }

    receiveEvent({ type, data }) {

        if (this.spline && Ribbon.getRenderStyle() === sceneManager.renderStyle) {

            if ('DidLeaveGenomicNavigator' === type) {
                this.highlightBeads[ 0 ].visible = this.highlightBeads[ 1 ].visible = false
            } else if ('DidUpdateGenomicInterpolant' === type) {

                const { interpolantList } = data

                for (let interpolant of interpolantList) {

                    const { x, y, z } = this.curve.getPointAt(interpolant)
                    const index = interpolantList.indexOf(interpolant)
                    this.highlightBeads[ index ].position.set(x, y, z)
                    this.highlightBeads[ index ].visible = true
                }

            }

        }

    }

    configure(trace) {

        this.dispose()

        this.trace = trace;

        const str = 'Ribbon.configure()';
        console.time(str);

        const vertices = getSingleCentroidVertices(trace, true)
        this.curve = new THREE.CatmullRomCurve3( vertices )
        this.curve.arcLengthDivisions = 1e3;

        this.spline = createFatSpline(this.curve, igvPanel.materialProvider)

        console.timeEnd(str);

        if (sceneManager.renderStyle === Ribbon.getRenderStyle()) {
            this.show()
        } else {
            this.hide()
        }

    }

    updateMaterialProvider (materialProvider) {
        if (this.spline) {
            const colors = getRGBListWithMaterialAndLength(materialProvider, this.spline.vertexCount)
            this.spline.mesh.geometry.setColors(colors)
        }
    }

    addToScene (scene) {

        scene.add( this.spline.mesh )

        const { center, radius } = EnsembleManager.getTraceBounds(this.trace)

        this.highlightBeads = []

        const material = new THREE.MeshPhongMaterial({ color: appleCrayonColorThreeJS('maraschino') })
        const geometry = new THREE.SphereGeometry( radius * highlightBeadRadiusScalefactor, 64, 32 )
        this.highlightBeads[ 0 ] = new THREE.Mesh( geometry, material )
        this.highlightBeads[ 1 ] = new THREE.Mesh( geometry, material )

        scene.add( this.highlightBeads[ 0 ] )
        scene.add( this.highlightBeads[ 1 ] )

        const { x, y, z } = center
        this.highlightBeads[ 0 ].position.set(x, y, z)
        this.highlightBeads[ 1 ].position.set(x, y, z)

        this.highlightBeads[ 0 ].visible = false
        this.highlightBeads[ 1 ].visible = false

    }

    renderLoopHelper () {
        if (this.spline) {
            this.spline.mesh.material.resolution.set(window.innerWidth, window.innerHeight)
            // this.updateMaterialProvider(igvPanel.materialProvider)
        }
    }

    hide () {
        this.spline.mesh.visible = false

        if (this.highlightBeads) {
            this.highlightBeads[ 0 ].visible = false
            this.highlightBeads[ 1 ].visible = false
        }
    }

    show () {
        this.spline.mesh.visible = true

        // if (this.highlightBeads) {
        //     this.highlightBeads[ 0 ].visible = true
        //     this.highlightBeads[ 1 ].visible = true
        // }
    }

    dispose () {

        if (this.spline) {
            this.spline.mesh.material.dispose()
            this.spline.mesh.geometry.dispose()
        }

        if (this.highlightBeads) {
            for (let { geometry, material } of this.highlightBeads) {
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

function createFatSpline(curve, materialProvider) {

    const pointCount = getFatSplinePointCount(curve.getLength());

    const str = `createFatSpline. ${ pointCount } vertices and colors.`;
    console.time(str);

    const xyzList = curve.getSpacedPoints( pointCount )

    const colors = getRGBListWithMaterialAndLength(materialProvider, xyzList.length);

    const vertices = [];
    for (let { x, y, z } of xyzList ) {
        vertices.push(x, y, z);
    }

    const geometry = new LineGeometry();

    geometry.setPositions( vertices )
    geometry.setColors( colors )

    const material = new LineMaterial( { linewidth: ribbonWidth, vertexColors: true } );

    const mesh = new Line2(geometry, material);
    mesh.computeLineDistances();
    mesh.scale.set( 1, 1, 1 );
    mesh.name = 'ribbon';

    console.timeEnd(str);

    return { mesh, vertexCount: xyzList.length };

}

function getRGBListWithMaterialAndLength(materialProvider, length) {

    let rgbList = new Float32Array(length * 3)

    for (let i = 0; i < length; i++) {
        materialProvider.colorForInterpolant(i / (length - 1)).toArray(rgbList, i * 3)
    }

    return rgbList
}

const RibbonScaleFactor = 4e3

function getFatSplinePointCount(curveLength) {
    return Ribbon.getCountMultiplier(curveLength) * RibbonScaleFactor
}

export default Ribbon;
