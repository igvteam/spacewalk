import * as THREE from "three"
import {StringUtils} from "igv-utils";
import SpacewalkEventBus from './spacewalkEventBus.js'
import { Line2 } from "three/examples/jsm/lines/Line2.js"
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js"
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js"
import EnsembleManager from './ensembleManager.js'
import {igvPanel, sceneManager, ensembleManager, scene} from "./app.js"
import {appleCrayonColorThreeJS} from "./utils/colorUtils.js";

const ribbonWidth = 4/*2*/
const highlightBeadRadiusScalefactor = 1/(6e1)
const RibbonScaleFactor = 32

class Ribbon {

    static renderStyle = 'render-style-ribbon'

    constructor() {

        SpacewalkEventBus.globalBus.subscribe('DidUpdateGenomicInterpolant', this)
        SpacewalkEventBus.globalBus.subscribe('DidLeaveGenomicNavigator', this)
    }

    receiveEvent({ type, data }) {

        if (this.spline && Ribbon.renderStyle === sceneManager.renderStyle) {

            if ('DidLeaveGenomicNavigator' === type || 'DidHideCrosshairs' === type) {
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

        const traceVertices = EnsembleManager.getSingleCentroidVertices(trace, true)
        this.curve = new THREE.CatmullRomCurve3( traceVertices )
        this.curve.arcLengthDivisions = 2e3
        this.curve.updateArcLengths()

        const geometry = new LineGeometry()

        const curvePointCount = Math.round(traceVertices.length * RibbonScaleFactor)
        const curvePoints = this.curve.getSpacedPoints( curvePointCount )

        const a = `Trace vertices(${ StringUtils.numberFormatter(traceVertices.length) })`
        const b = `Curve points(${ StringUtils.numberFormatter(curvePointCount) })`

        console.log(`Ribbon.createFatSpline ${ a } ${ b }`)
        const positions = []
        for (const { x, y, z } of curvePoints ) {
            positions.push(x, y, z)
        }
        geometry.setPositions( positions )

        const colors = getRGBListWithMaterialAndLength(igvPanel.materialProvider, curvePoints.length)
        geometry.setColors( colors )

        const material = new LineMaterial( { linewidth: ribbonWidth, vertexColors: true } )

        const mesh = new Line2(geometry, material)
        mesh.computeLineDistances()
        mesh.scale.set( 1, 1, 1 )
        mesh.name = 'ribbon'

        this.spline = { mesh, vertexCount: curvePoints.length }

        if (sceneManager.renderStyle === Ribbon.renderStyle) {
            this.show()
        } else {
            this.hide()
        }

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

    dispose () {

        if (this.spline) {
            scene.remove(this.spline)
            this.spline.mesh.material.dispose()
            this.spline.mesh.geometry.dispose()
            this.spline = undefined
        }

        if (this.highlightBeads) {

            scene.remove( this.highlightBeads[ 0 ] )
            scene.remove( this.highlightBeads[ 1 ] )

            for (let { geometry, material } of this.highlightBeads) {
                material.dispose()
                geometry.dispose()
            }

            this.highlightBeads[ 0 ] = undefined
            this.highlightBeads[ 1 ] = undefined
            this.highlightBeads = undefined
        }
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

}

function getRGBListWithMaterialAndLength(materialProvider, length) {

    const rgbList = new Float32Array(length * 3)

    for (let i = 0; i < length; i++) {
        materialProvider.colorForInterpolant(i / (length - 1)).toArray(rgbList, i * 3)
    }

    return rgbList
}

export default Ribbon;
