import * as THREE from "../node_modules/three/build/three.module.js";
import FatLineGeometry from "./threejs_es6/fatlines/fatLineGeometry.js";
import FatLineMaterial from "./threejs_es6/fatlines/fatLineMaterial.js";
import FatLine from "./threejs_es6/fatlines/fatLine.js";
import { getBoundsWithTrace } from './ensembleManager.js';
import Globals from './globals.js';
import { degrees, clamp, lerp } from './math.js';
import { numberFormatter } from "./utils.js";

let fatLineMaterial;

class Noodle {

    constructor () {
    }

    static getRenderStyle() {
        return 'render-style-noodle';
    }

    configure(trace) {

        this.dispose();

        this.trace = trace;

        this.curve = new THREE.CatmullRomCurve3(trace.geometry.vertices);
        console.log(`CatmullRom Curve. Length ${ numberFormatter( this.curve.getLength() ) }. Divisions ${ this.curve.arcLengthDivisions }`);

        this.tube = createTube(this.curve, Globals.sceneManager.materialProvider.material);
        this.spline = createFatSpline(this.curve, Globals.sceneManager.materialProvider);

        if (Globals.sceneManager.renderStyle === Noodle.getRenderStyle()) {
            this.show();
        } else {
            this.hide();
        }

    }

    updateMaterialProvider (materialProvider) {

        if (undefined === this.tube || undefined === this.spline) {
            return;
        }

        // tube
        this.tube.material = materialProvider.material;

        // fat spline
        let colors = getColorListWithXYZList(materialProvider, this.spline.xyzList);
        this.spline.mesh.geometry.setColors( colors );

    }

    addToScene (scene) {
        scene.add( this.tube );
        scene.add( this.spline.mesh );
    }

    renderLoopHelper () {

        if (fatLineMaterial) {
            fatLineMaterial.resolution.set(window.innerWidth, window.innerHeight);
        }

    }

    hide () {
        this.tube.visible = this.spline.mesh.visible = false;
    }

    show () {
        this.tube.visible = this.spline.mesh.visible = true;
    }

    updateRadius(radius) {
        const tubularSegments = getTubularSegmentCount(this.curve.getLength());
        const radialSegments = getRadialSegmentCount(Globals.parser.locus);
        this.tube.geometry.copy(new THREE.TubeBufferGeometry(this.curve, tubularSegments, radius, radialSegments, false));
    }

    dispose () {

        if (this.tube) {
            let { material, geometry } = this.tube;
            [ material, geometry ].forEach(item => item.dispose());
        }

        if (this.spline) {
            let { material, geometry } = this.spline.mesh;
            [ material, geometry ].forEach(item => item.dispose())
        }

    }

    getThumbnailGeometryList () {
        return [ this.tube.geometry ];
    }

    getBounds() {
        return getBoundsWithTrace(this.trace);
    }

    getCameraPoseAlongAxis ({ axis, scaleFactor }) {

        const { center, radius } = this.getBounds();

        const dimen = scaleFactor * radius;

        const theta = Math.atan(radius/dimen);
        const fov = degrees( 2 * theta);

        const axes =
            {
                '-x': () => {
                    return new THREE.Vector3(-dimen, 0, 0);
                },
                '+x': () => {
                    return new THREE.Vector3(dimen, 0, 0);
                },
                '-y': () => {
                    return new THREE.Vector3(0, -dimen, 0);
                },
                '+y': () => {
                    return new THREE.Vector3(0, dimen, 0);
                },
                '-z': () => {
                    return new THREE.Vector3(0, 0, -dimen);
                },
                '+z': () => {
                    return new THREE.Vector3(0, 0, dimen);
                },
            };

        const vector = axes[ axis ]();
        let position = new THREE.Vector3();

        position.addVectors(center, vector);

        return { target:center, position, fov }
    }

}

const createTube = (curve, material) => {

    const tubularSegments = getTubularSegmentCount(curve.getLength());
    const radialSegments = getRadialSegmentCount(Globals.parser.locus);

    const geometry = new THREE.TubeBufferGeometry(curve, tubularSegments, Globals.sceneManager.noodleRadius(), radialSegments, false);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'noodle';

    return mesh;

};

const createFatSpline = (curve, materialProvider) => {

    const pointCount = getFatSplinePointCount(curve.getLength());

    const xyzList = curve.getPoints( pointCount );

    let colors = getColorListWithXYZList(materialProvider, xyzList);

    let fatLineGeometry = new FatLineGeometry();

    let vertices = [];
    xyzList.forEach((xyz) => {
        const { x, y, z } = xyz;
        vertices.push(x, y, z);
    });

    fatLineGeometry.setPositions( vertices );
    fatLineGeometry.setColors( colors );

    fatLineMaterial = new FatLineMaterial( { linewidth: /*2*/3, vertexColors: THREE.VertexColors } );

    let mesh = new FatLine(fatLineGeometry, fatLineMaterial);
    mesh.computeLineDistances();
    mesh.scale.set( 1, 1, 1 );
    mesh.name = 'noodle_spline';

    return { mesh, xyzList };

};

const getRadialSegmentCount = locus => {

    const { genomicStart, genomicEnd } = locus;
    const genomicLengthMB = (genomicEnd - genomicStart) / 1e6;

    const [ minLog10, maxLog10 ] = [ 0.25, 2.5 ];
    let log10 = Math.log10(genomicLengthMB);
    log10 = clamp(log10, minLog10, maxLog10);

    const interpolant = (log10 - minLog10) / (maxLog10 - minLog10);

    let count = lerp(48, 4, interpolant);
    count = Math.round(count);

    return count;

};

const getTubularSegmentCount = curveLength => {
    return getCountMultiplier(curveLength) * 1024;
};

const getFatSplinePointCount = curveLength => {
    return getCountMultiplier(curveLength) * 1024;
};

const getCountMultiplier = curveLength => {
    const count = Math.round( Math.max(1, curveLength / 16000) );
    return count;
};

const getColorListWithXYZList = (materialProvider, xyzList) =>  {

    let colorList = [];

    xyzList
        .map((xyz, i, array) => {
            let interpolant = i / (array.length - 1);
            return materialProvider.colorForInterpolant(interpolant);
        })
        .forEach((rgb) => {
            const { r, g, b } = rgb;
            colorList.push(r, g, b);
        });

    return colorList;
};

export default Noodle;
