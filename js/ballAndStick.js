import * as THREE from 'three'
import { StringUtils } from 'igv-utils'
import SpacewalkEventBus from './spacewalkEventBus.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {clamp, lerp} from './utils/mathUtils.js'
import {ensembleManager, igvPanel, scene, sceneManager} from './main.js'
import { appleCrayonColorThreeJS } from "./utils/colorUtils.js"
import EnsembleManager from './ensembleManager.js'
import ConvexHull from "./utils/convexHull.js"
import {getPositionArrayWithTrace} from "./utils/utils.js"
import { removeAndDisposeFromScene } from './utils/disposalUtils.js'

let ballRadiusIndex = undefined;
let ballRadiusTable = undefined;

let stickRadiusIndex = undefined;
let stickRadiusTable = undefined;

const stickTesselation = { length: 2, radial: 8 }

class BallAndStick {

    static renderStyle = 'render-style-ball-stick'

    constructor ({ pickHighlighter, stickMaterial }) {

        this.pickHighlighter = pickHighlighter;

        this.stickMaterial = stickMaterial;

        this.isStickVisible = true;

        SpacewalkEventBus.globalBus.subscribe("DidUpdateGenomicInterpolant", this);
        SpacewalkEventBus.globalBus.subscribe("DidHideCrosshairs", this);
     }

    receiveEvent({ type, data }) {

        if (this.balls && BallAndStick.renderStyle === sceneManager.renderStyle) {

            if ("DidUpdateGenomicInterpolant" === type) {

                const { interpolantList } = data

                if (interpolantList){
                    const interpolantWindowList = ensembleManager.getGenomicInterpolantWindowList(interpolantList)

                    if (interpolantWindowList) {
                        const instanceIdList = interpolantWindowList.map(({ index }) => index)
                        this.pickHighlighter.configureWithInstanceIdList(instanceIdList);
                    }

                } else {
                    this.pickHighlighter.unhighlight()
                }

            } else if ('DidHideCrosshairs' === type) {
                this.pickHighlighter.unhighlight()
            }

        }

    }

    configure(trace) {

        const stickCurves = createStickCurves(EnsembleManager.getSingleCentroidVertices(trace, true))
        const averageCurveDistance  = computeAverageCurveDistance(stickCurves)

        stickRadiusTable = generateRadiusTable(0.5e-1 * averageCurveDistance);
        stickRadiusIndex = Math.floor( stickRadiusTable.length/2 );
        this.sticks = this.createSticks(trace, stickRadiusTable[ stickRadiusIndex ]);

        ballRadiusTable = generateRadiusTable(2e-1 * averageCurveDistance);
        ballRadiusIndex = Math.floor( ballRadiusTable.length/2 );
        this.balls = this.createBalls(trace, igvPanel.materialProvider, ballRadiusTable[ ballRadiusIndex ]);

        const positionArray = getPositionArrayWithTrace(trace)
        this.hull = new ConvexHull(positionArray)
        this.hull.mesh.name = 'ball_and_stick_convex_hull'

        if (sceneManager.renderStyle === BallAndStick.renderStyle) {
            this.show();
        } else {
            this.hide();
        }
    }

    createBalls(trace, materialProvider, ballRadius) {

        // canonical ball geometry
        const widthSegments = 32
        const heightSegments = 16
        const geometry = new THREE.SphereGeometry(1, widthSegments, heightSegments)
        geometry.computeVertexNormals()

        console.log(`Ball&Stick. Create ${ StringUtils.numberFormatter(trace.length) } balls. Tesselation width ${ widthSegments } height ${ heightSegments }`)

        const genomicExtentList = ensembleManager.getCurrentGenomicExtentList()

        const colorList = new Array(trace.length)
            .fill()
            .flatMap((_, i) => {
                const color = materialProvider.colorForInterpolant(genomicExtentList[ i ].interpolant)
                return color.toArray()
            })

        // assign instance color list to canonical geometry
        geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(new Float32Array(colorList), 3) )

        const material = getColorRampMaterial('instanceColor')
        // const material = new THREE.MeshNormalMaterial()

        const mesh = new THREE.InstancedMesh(geometry, material, trace.length)

        const matrix = new THREE.Matrix4()

        const point = new THREE.Vector3()
        const rotation = new THREE.Euler()
        const quaternion = new THREE.Quaternion()
        const scale = new THREE.Vector3()

        trace.map(({ xyz }) => xyz).forEach((xyz, i) => {

            point.x = xyz.x
            point.y = xyz.y
            point.z = xyz.z

            rotation.x = 0
            rotation.y = 0
            rotation.z = 0
            quaternion.setFromEuler( rotation )

            scale.setScalar(true === xyz.isMissingData ? 1 : ballRadius)

            matrix.compose(point, quaternion, scale)

            mesh.setMatrixAt(i, matrix)
        })

        return mesh
    }

    createSticks(trace, stickRadius) {

        const geometries = []

        const vertices = EnsembleManager.getSingleCentroidVertices(trace, true)

        const endPoints = []
        for (let i = 0; i < vertices.length - 1; i++) {
            endPoints.push({ a: vertices[ i ], b: vertices[ i + 1 ] })
        }

        for (let { a, b } of endPoints) {

            // stick has length equal to distance between endpoints
            const distance = a.distanceTo( b )
            const cylinder = new THREE.CylinderGeometry(stickRadius, stickRadius, distance, stickTesselation.radial, stickTesselation.length)

            // stick endpoints define the axis of stick alignment
            const { x:ax, y:ay, z:az } = a
            const { x:bx, y:by, z:bz } = b
            const stickAxis = new THREE.Vector3(bx-ax, by-ay, bz-az).normalize()

            // Use quaternion to rotate cylinder from default to target orientation
            const quaternion = new THREE.Quaternion()
            const cylinderUpAxis = new THREE.Vector3( 0, 1, 0 )
            quaternion.setFromUnitVectors(cylinderUpAxis, stickAxis)
            cylinder.applyQuaternion(quaternion)

            // Translate oriented stick to location between endpoints
            cylinder.translate((bx+ax)/2, (by+ay)/2, (bz+az)/2)

            // add to geometry list
            geometries.push(cylinder)

        }

        // Aggregate geometry list into single BufferGeometry
        const material = this.stickMaterial.clone()

        const bufferGeometry = mergeGeometries(geometries)
        const mesh = new THREE.Mesh(bufferGeometry, material)
        mesh.name = 'stick';
        return mesh;

    }

    setStickVisibility(visible) {
        this.isStickVisible = visible
    }

    updateBallRadius(increment) {

        ballRadiusIndex = clamp(ballRadiusIndex + increment, 0, ballRadiusTable.length - 1)
        const radius = ballRadiusTable[ ballRadiusIndex ]

        const matrix = new THREE.Matrix4()
        const pp = new THREE.Vector3()
        const qq = new THREE.Quaternion()
        const ss = new THREE.Vector3()
        for (let i = 0; i < ensembleManager.currentTrace.length; i++) {

            this.balls.getMatrixAt(i, matrix)
            matrix.decompose(pp, qq, ss)

            ss.setScalar(radius)
            matrix.compose(pp, qq, ss)
            this.balls.setMatrixAt(i, matrix)
        }

        this.balls.instanceMatrix.needsUpdate = true
    }

    updateStickRadius(increment) {
        stickRadiusIndex = clamp(stickRadiusIndex + increment, 0, stickRadiusTable.length - 1)
        const radius = stickRadiusTable[ stickRadiusIndex ]
        // const geometries = this.sticks.map(curve => new THREE.TubeBufferGeometry(curve, stickTesselation.length, radius, stickTesselation.radial, false));
        // this.sticks.geometry.copy(mergeGeometries( geometries ));
    }

    updateMaterialProvider (materialProvider) {

        if (this.balls) {

            for (let i = 0; i < ensembleManager.currentTrace.length; i++) {
                const { interpolant } = ensembleManager.currentTrace[ i ]
                const color = materialProvider.colorForInterpolant(interpolant)

                const bufferAttribute = this.balls.geometry.getAttribute('instanceColor')
                color.toArray(bufferAttribute.array, i * 3)
            }

            this.balls.geometry.attributes.instanceColor.needsUpdate = true

        }

    }

    renderLoopHelper () {

        if (this.balls) {
            this.balls.geometry.attributes.instanceColor.needsUpdate = true
        }

        if (this.sticks) {
            this.sticks.visible = (this.isStickVisible && sceneManager.renderStyle === BallAndStick.renderStyle)
        }
    }

    addToScene (scene) {
        scene.add(this.balls)
        scene.add(this.sticks)
        // scene.add(this.hull.mesh)
    }

    dispose () {

        if (this.balls) {
            removeAndDisposeFromScene(scene, this.balls)
            this.balls = undefined
        }

        if (this.sticks) {
            removeAndDisposeFromScene(scene, this.sticks)
            this.sticks = undefined
        }

        if (this.hull && this.hull.mesh) {
            removeAndDisposeFromScene(scene, this.hull.mesh)
            this.hull.mesh = undefined
            this.hull = undefined
        }
    }

    hide () {
        if (undefined === this.balls) {
            return
        }
        this.balls.visible = false
        this.sticks.visible = false
        this.hull.mesh.visible = false
    }

    show () {
        if (undefined === this.balls) {
            return
        }
        this.balls.visible = true
        this.sticks.visible = true
        this.hull.mesh.visible = true
    }

}

function getPositionArrayWithBallsInstancedMesh(mesh) {

    const geometry = mesh.geometry; // Canonical sphere geometry
    const baseVertices = geometry.attributes.position.array; // Base sphere vertices

    const matrix = new THREE.Matrix4();
    const vertex = new THREE.Vector3();

    const aggregateVertices = []; // Store all transformed vertices
    for (let i = 0; i < mesh.count; i++) {

        // Get the transformation matrix for the current instance
        mesh.getMatrixAt(i, matrix);

        // Transform canonical sphere vertices
        for (let j = 0; j < baseVertices.length; j += 3) {

            vertex.set(baseVertices[j], baseVertices[j + 1], baseVertices[j + 2]);
            vertex.applyMatrix4(matrix);

            aggregateVertices.push(vertex.x, vertex.y, vertex.z);
        }
    }

    return aggregateVertices;
}

function generateRadiusTable(defaultRadius) {

    const radiusTableLength = 11;
    const radiusTable = [];

    for (let i = 0; i < radiusTableLength; i++) {
        const interpolant = i / (radiusTableLength - 1);
        const radius = lerp(0.5 * defaultRadius, 2.0 * defaultRadius, interpolant);
        radiusTable.push(radius);
    }

    return radiusTable
}

function computeAverageCurveDistance (curves) {

    let acc = 0;
    const sum = curves
        .reduce((accumulator, curve) => {
            accumulator += curve.getLength();
            return accumulator;
        }, acc);

    return sum / curves.length;

}

function createStickCurves (vertices) {

    let curves = [];
    for (let i = 0, j = 1; j < vertices.length; ++i, ++j) {
        curves.push( new THREE.CatmullRomCurve3([ vertices[i], vertices[j] ]) );
    }

    return curves;
}

function getColorRampMaterial(instanceColor){

    const material = new THREE.MeshPhongMaterial({ color: appleCrayonColorThreeJS('snow') });

    material.onBeforeCompile = shader => {

        const colorParsChunk =
            [
                `attribute vec3 ${ instanceColor };`,
                `varying vec3 v_${ instanceColor };`,
                '#include <common>'
            ].join( '\n' );

        const instanceColorChunk =
            [
                '#include <begin_vertex>',
                `v_${ instanceColor } = ${ instanceColor };`
            ].join( '\n' );

        shader.vertexShader = shader.vertexShader
            .replace( '#include <common>', colorParsChunk )
            .replace( '#include <begin_vertex>', instanceColorChunk );

        const fragmentParsChunk =
            [
                `varying vec3 v_${ instanceColor };`,
                '#include <common>'
            ].join( '\n' );

        const colorChunk =
            [
                `vec4 diffuseColor = vec4( diffuse * v_${ instanceColor }, opacity );`
            ].join( '\n' );

        shader.fragmentShader = shader.fragmentShader
            .replace( '#include <common>', fragmentParsChunk )
            .replace( 'vec4 diffuseColor = vec4( diffuse, opacity );', colorChunk );

    };

    return material;
}

export default BallAndStick;
