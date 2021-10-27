import { EventBus } from 'igv-widgets'
import * as THREE from "three";
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { StringUtils } from 'igv-utils'
import { clamp } from './math.js';
import EnsembleManager from "./ensembleManager.js";
import { generateRadiusTable } from "./utils.js";
import { ensembleManager, sceneManager, igvPanel } from './app.js'
import { appleCrayonColorThreeJS } from "./color.js";
import ColorRampMaterialProvider from "./colorRampMaterialProvider";

let ballRadiusIndex = undefined;
let ballRadiusTable = undefined;

let stickRadiusIndex = undefined;
let stickRadiusTable = undefined;

const stickTesselation = { length: 2, radial: 8 }

class BallAndStick {

    constructor ({ pickHighlighter }) {

        this.pickHighlighter = pickHighlighter;

        EventBus.globalBus.subscribe("DidUpdateGenomicInterpolant", this);
     }

    receiveEvent({ type, data }) {

        if (this.balls && BallAndStick.getRenderStyle() === sceneManager.renderStyle) {

            if ("DidUpdateGenomicInterpolant" === type) {

                const { interpolantList } = data;

                const interpolantWindowList = EnsembleManager.getInterpolantWindowList({ trace: ensembleManager.currentTrace, interpolantList });

                if (interpolantWindowList) {
                    const instanceIdList = interpolantWindowList.map(({ index }) => index)
                    this.pickHighlighter.configureWithInstanceIdList(instanceIdList);
                }

            }

        }

    }

    configure(trace) {

        this.dispose();

        this.trace = trace;

        const stickCurves = createStickCurves(EnsembleManager.getSingleCentroidVerticesWithTrace(trace))
        const averageCurveDistance  = computeAverageCurveDistance(stickCurves)
        console.log(`Ball&Stick. Average Curve Distance ${StringUtils.numberFormatter(Math.round(averageCurveDistance)) }`)

        stickRadiusTable = generateRadiusTable(0.5e-1 * averageCurveDistance);
        stickRadiusIndex = Math.floor( stickRadiusTable.length/2 );
        this.sticks = this.createSticks(trace, stickRadiusTable[ stickRadiusIndex ]);

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

        // canonical ball geometry
        const widthSegments = 32
        const heightSegments = 16
        const geometry = new THREE.SphereBufferGeometry(1, widthSegments, heightSegments)
        geometry.computeVertexNormals()

        console.log(`Ball&Stick. Create ${ StringUtils.numberFormatter(trace.length) } balls. Tesselation width ${ widthSegments } height ${ heightSegments }`)

        // material stuff
        this.rgb = trace.map(({ colorRampInterpolantWindow }) => igvPanel.materialProvider.colorForInterpolant(colorRampInterpolantWindow.interpolant))

        const color = new THREE.Color()
        const list = new Array(trace.length).fill().flatMap((_, i) => color.set(this.rgb[ i ]).toArray())
        this.rgbFloat32Array = Float32Array.from(list)

        // assign instance color list to canonical geometry
        geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(this.rgbFloat32Array, 3) )

        const material = getColorRampMaterial('instanceColor')
        // const material = new THREE.MeshNormalMaterial()

        const mesh = new THREE.InstancedMesh(geometry, material, trace.length)

        const matrix = new THREE.Matrix4()

        const xyz = new THREE.Vector3()
        const rotation = new THREE.Euler()
        const quaternion = new THREE.Quaternion()
        const scale = new THREE.Vector3()

        EnsembleManager.getSingleCentroidVerticesWithTrace(trace).forEach(({ x, y, z }, i) => {

            xyz.x = x
            xyz.y = y
            xyz.z = z

            rotation.x = 0
            rotation.y = 0
            rotation.z = 0
            quaternion.setFromEuler( rotation )

            scale.setScalar(ballRadius)

            matrix.compose(xyz, quaternion, scale)

            mesh.setMatrixAt(i++, matrix)
        })

        return mesh
    }


    createSticks(trace, stickRadius) {

        const geometries = []
        const vertices = EnsembleManager.getSingleCentroidVerticesWithTrace(trace)

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
        const material = sceneManager.stickMaterial.clone();
        const mesh = new THREE.Mesh(mergeBufferGeometries( geometries ), material);
        mesh.name = 'stick';
        return mesh;

    }

    addToScene (scene) {
        scene.add(this.balls)
        scene.add(this.sticks)
    }

    hide () {
        this.balls.visible = false
        this.sticks.visible = false
    }

    show () {
        this.balls.visible = true
        this.sticks.visible = true
    }

    updateBallRadius(increment) {

        ballRadiusIndex = clamp(ballRadiusIndex + increment, 0, ballRadiusTable.length - 1)
        const radius = ballRadiusTable[ ballRadiusIndex ]

        for (let mesh of this.balls) {
            mesh.scale.setScalar(radius);
        }

    }

    updateStickRadius(increment) {
        stickRadiusIndex = clamp(stickRadiusIndex + increment, 0, stickRadiusTable.length - 1);
        const radius = stickRadiusTable[ stickRadiusIndex ];
        // const geometries = this.stickCurves.map(curve => new THREE.TubeBufferGeometry(curve, stickTesselation.length, radius, stickTesselation.radial, false));
        // this.sticks.geometry.copy(mergeBufferGeometries( geometries ));
    }

    updateMaterialProvider (materialProvider) {

        if (undefined === this.balls) {
            return
        }

        const color = new THREE.Color()

        this.rgb = []
        for (let i = 0; i < ensembleManager.currentTrace.length; i++) {
            const { colorRampInterpolantWindow } = ensembleManager.currentTrace[ i ]
            const interpolatedColor = materialProvider.colorForInterpolant(colorRampInterpolantWindow.interpolant)
            this.rgb.push( interpolatedColor );
            color.set(interpolatedColor).toArray(this.rgbFloat32Array, i * 3)
        }

        this.balls.geometry.attributes.instanceColor.needsUpdate = true
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
    }

    static getRenderStyle() {
        return 'render-style-ball-stick';
    }
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

let setVisibility = (objects, isVisible) => {
    objects.forEach(object => object.visible = isVisible);
};

export default BallAndStick;
