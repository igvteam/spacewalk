import * as THREE from "three"
import SpacewalkEventBus from './spacewalkEventBus.js'
import { Line2 } from "three/examples/jsm/lines/Line2.js"
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js"
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js"
import EnsembleManager from './ensembleManager.js'
import {igvPanel, sceneManager, ensembleManager} from "./app.js"
import {appleCrayonColorThreeJS} from "./color.js";
import {StringUtils} from "igv-utils";

const ribbonWidth = 4/*2*/
const highlightBeadRadiusScalefactor = 1/(6e1)
const RibbonScaleFactor = 32

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

        const str = `Ribbon.configure - Trace has ${ StringUtils.numberFormatter(EnsembleManager.getSingleCentroidVertices(trace, true)) } vertices`
        console.time(str);

        this.spline = this.createFatSpline(trace, igvPanel.materialProvider)

        console.timeEnd(str);

        if (sceneManager.renderStyle === Ribbon.getRenderStyle()) {
            this.show()
        } else {
            this.hide()
        }

    }

    createFatSpline(trace, materialProvider) {

        const traceVertices = EnsembleManager.getSingleCentroidVertices(trace, true)
        this.curve = new THREE.CatmullRomCurve3( traceVertices )
        this.curve.arcLengthDivisions = 2e3
        this.curve.updateArcLengths()

        const geometry = new LineGeometry()

        const curvePointCount = Math.round(traceVertices.length * RibbonScaleFactor)
        const curveSpacedPoints = this.curve.getSpacedPoints( curvePointCount )

        const geometryVertices = []
        for (const { x, y, z } of curveSpacedPoints ) {
            geometryVertices.push(x, y, z)
        }
        geometry.setPositions( geometryVertices )

        const geometryColors = getRGBListWithMaterialAndLength(materialProvider, curveSpacedPoints.length)
        geometry.setColors( geometryColors )

        const material = new LineMaterial( { linewidth: ribbonWidth, vertexColors: true } )

        const mesh = new Line2(geometry, material)
        mesh.computeLineDistances()
        mesh.scale.set( 1, 1, 1 )
        mesh.name = 'ribbon'


        return { mesh, vertexCount: curveSpacedPoints.length };

    }

    updateMaterialProvider (materialProvider) {
        if (this.spline) {
            const colors = getRGBListWithMaterialAndLength(materialProvider, this.spline.vertexCount)
            this.spline.mesh.geometry.setColors(colors)

            this.spline.mesh.geometry.attributes.instanceStart.needsUpdate = true
            this.spline.mesh.geometry.attributes.instanceEnd.needsUpdate = true

        }
    }

    addToScene (scene) {

        scene.add( this.spline.mesh )

        const { center, radius } = EnsembleManager.getTraceBounds(ensembleManager.currentTrace)

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

            this.spline.mesh.geometry.attributes.instanceStart.needsUpdate = true
            this.spline.mesh.geometry.attributes.instanceEnd.needsUpdate = true

        }
    }

    hide () {
        if (undefined === this.spline) {
            return
        }
        this.spline.mesh.visible = false

        if (this.highlightBeads) {
            this.highlightBeads[ 0 ].visible = false
            this.highlightBeads[ 1 ].visible = false
        }
    }

    show () {
        if (undefined === this.spline) {
            return
        }
        this.spline.mesh.visible = true
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

    static getRenderStyle() {
        return 'render-style-ribbon'
    }
}
function getRGBListWithMaterialAndLength(materialProvider, length) {

    let rgbList = new Float32Array(length * 3)

    for (let i = 0; i < length; i++) {
        materialProvider.colorForInterpolant(i / (length - 1)).toArray(rgbList, i * 3)
    }

    return rgbList
}

export default Ribbon;
