import * as THREE from "../node_modules/three/build/three.module.js";
import igv from '../vendor/igv.esm.js'
import { globalEventBus } from "./eventBus.js";
import { readFileAsText } from "./utils.js";
import { rgb255String, rgb255Lerp, appleCrayonColorRGB255 } from './color.js';

const rgbMin = appleCrayonColorRGB255('blueberry');
const rgbMax = appleCrayonColorRGB255('strawberry');
class EnsembleManager {

    constructor () {
        this.stepSize = 3e4;
        this.path = undefined;
    }

    ingest(string){

        this.ensemble = {};

        const lines = string.split(/\r?\n/);

        // discard blurb
        lines.shift();

        // discard column titles
        lines.shift();

        // chr-index ( 0-based)| segment-index (one-based) | Z | X | y

        let key;
        let trace;
        for (let line of lines) {

            if ("" !== line) {

                let parts = line.split(',');

                if ('nan' === parts[ 2 ] || 'nan' === parts[ 3 ] || 'nan' === parts[ 4 ]) {
                    // do nothing
                } else {

                    const index = parseInt(parts[ 0 ], 10) - 1;

                    if (undefined === key || key !== index.toString()) {

                        key = index.toString();

                        this.ensemble[ key ] = trace =
                            {
                                geometry: new THREE.Geometry(),
                                material: new THREE.MeshPhongMaterial()
                            };

                    }

                    // discard chr-index
                    parts.shift();

                    // discard segment-index
                    parts.shift();

                    let [ z, x, y ] = parts;
                    trace.geometry.vertices.push( new THREE.Vector3(parseFloat(x), parseFloat(y), parseFloat(z)) );
                }

            }

        } // for (lines)

        const ensembleList = Object.values(this.ensemble);

        // compute and store bounds
        for (trace of ensembleList) {
            trace.geometry.computeBoundingBox();
            trace.geometry.computeBoundingSphere();
            // getDistanceMapCanvasWithTrack(trace, rgbMin, rgbMax)
        }

    }

    getBoundsWithTrace(trace) {
        const { center, radius } = trace.geometry.boundingSphere;
        const { min, max } = trace.geometry.boundingBox;
        return { min, max, center, radius }
    }

    traceWithName(name) {
        // return this.ensemble[ name ] || undefined;
        return this.ensemble[ name ] || undefined;
    }

    parsePathEncodedGenomicLocation(path) {

        let dev_null;
        let parts = path.split('_');
        dev_null = parts.shift();
        let locus = parts[ 0 ];

        let [ chr, start, end ] = locus.split('-');

        dev_null = end.split(''); // 3 0 M b
        dev_null.pop(); // 3 0 M
        dev_null.pop(); // 3 0
        end = dev_null.join(''); // 30

        this.locus = { chr, genomicStart: parseInt(start) * 1e6, genomicEnd: parseInt(end) * 1e6 };
    };

    async loadURL ({ url, name }) {

        try {

            let urlContents = await igv.xhr.load(url);
            const { file } = igv.parseUri(url);

            globalEventBus.post({ type: "DidLoadFile", data: { name: file, payload: urlContents } });

        } catch (error) {
            console.warn(error.message);
        }

    }

    async loadLocalFile ({ file }) {

        try {
            const fileContents = await readFileAsText(file);
            globalEventBus.post({ type: "DidLoadFile", data: { name: file.name, payload: fileContents } });
        } catch (e) {
            console.warn(e.message)
        }

    }
}

const getDistanceMapCanvasWithTrack = (trace, rgbMin, rgbMax) => {

    let { vertices } = trace.geometry;
    let { length } = vertices;

    let distances = new Array(length * length);
    let maxDistance = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < length; i++) {

        const candidate = vertices[ i ];

        for (let j = 0; j < length; j++) {

            const ij = i * length + j;
            const ji = j * length + i;

            const centroid = vertices[ j ];

            if (i === j) {
                distances[ ij ] = 0;
            } else {

                const distance = candidate.distanceTo(centroid);

                maxDistance = Math.max(maxDistance, distance);

                distances[ ij ] = distance;

                if (distances[ ji ]) {
                    // no need to duplicate distance calculation
                    // console.log('dupe i' + i + ' j ' + j);
                } else {
                    distances[ ji ] = distance;
                }
            }

        } // for (j)

    } // for (i)

    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    ctx.canvas.width = ctx.canvas.height = length;

    // clear canvas
    ctx.fillStyle = rgb255String( appleCrayonColorRGB255('blueberry') );
    ctx.fillRect(0, 0, length, length);

    // paint distances as lerp'd color
    for (let i = 0; i < length; i++) {
        for(let j = 0; j < length; j++) {

            const ij = i * length + j;
            const interpolant = (maxDistance - distances[ ij ]) / maxDistance;

            ctx.fillStyle = rgb255String( rgb255Lerp(rgbMin, rgbMax, interpolant) );
            ctx.fillRect(i, j, 1, 1);
        }
    }

    return canvas;
};

export default EnsembleManager;
