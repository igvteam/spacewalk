import * as THREE from "../node_modules/three/build/three.module.js";
import EnsembleManager from "./ensembleManager.js";
import { generateRadiusTable } from "./utils.js";
import { ensembleManager, sceneManager, igvPanel } from './app.js'
import { clamp, lerp } from './math.js';
import { StringUtils } from '../node_modules/igv-utils/src/index.js';

let noodleRadiusIndex = undefined;
let noodleRadiusTable = undefined;

class Noodle {

    constructor () {
    }

    static getRenderStyle() {
        return 'render-style-noodle';
    }

    configure(trace) {

        this.dispose();

        this.trace = trace;

        const str = 'Noodle.configure()';
        console.time(str);

        const vertices = EnsembleManager.getSingleCentroidVerticesWithTrace(trace);
        this.curve = new THREE.CatmullRomCurve3( vertices );

        // default value is 200
        this.curve.arcLengthDivisions = 1000;

        const averageCurveDistance = this.curve.getLength() / vertices.length;

        noodleRadiusTable = generateRadiusTable(1e-1 * averageCurveDistance);
        noodleRadiusIndex = Math.floor( noodleRadiusTable.length/2 );

        const tubeRadius = noodleRadiusTable[ noodleRadiusIndex ];

        this.tube = createTube(this.curve, tubeRadius, igvPanel.materialProvider.material);

        console.timeEnd(str);

        if (sceneManager.renderStyle === Noodle.getRenderStyle()) {
            this.show();
        } else {
            this.hide();
        }

    }

    updateMaterialProvider (materialProvider) {

        if (undefined === this.tube) {
            return;
        }

        this.tube.material = materialProvider.material;

    }

    addToScene (scene) {
        scene.add( this.tube );
    }

    renderLoopHelper () {
        // nuthin'
    }

    hide () {
        this.tube.visible = false;
    }

    show () {
        this.tube.visible = true;
    }

    updateRadius(increment) {

        const tubularSegments = getTubularSegmentCount(this.curve.getLength());
        const radialSegments = getRadialSegmentCount(ensembleManager.locus);

        noodleRadiusIndex = clamp(noodleRadiusIndex + increment, 0, noodleRadiusTable.length - 1);
        const radius = noodleRadiusTable[ noodleRadiusIndex ];

        this.tube.geometry.copy(new THREE.TubeBufferGeometry(this.curve, tubularSegments, radius, radialSegments, false));
    }

    dispose () {

        if (this.tube) {
            [ this.tube.material, this.tube.geometry ].forEach(item => item.dispose());
        }

    }

    getBounds() {
        return EnsembleManager.getBoundsWithTrace(this.trace);
    }

    static getCountMultiplier(curveLength) {
        return Math.round( Math.max(1, curveLength / 16000) );
    }

}

const createTube = (curve, tubeRadius, material) => {

    console.log(`noodle.createTube: curve length ${ StringUtils.numberFormatter( curve.getLength() ) }`);

    const tubularSegments = getTubularSegmentCount(curve.getLength());
    const radialSegments = getRadialSegmentCount(ensembleManager.locus);

    const str = `createTube. ${ tubularSegments } tubes. ${ radialSegments } radial segments.`;
    console.time(str);

    const geometry = new THREE.TubeBufferGeometry(curve, tubularSegments, tubeRadius, radialSegments, false);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'noodle';

    console.timeEnd(str);

    return mesh;

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

export const NoodleScaleFactor = 1024;

const getTubularSegmentCount = curveLength => {
    return Noodle.getCountMultiplier(curveLength) * NoodleScaleFactor;
};


export default Noodle;
