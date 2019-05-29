import * as THREE from "../node_modules/three/build/three.module.js";
import igv from '../vendor/igv.esm.js'
import KDBush from '../node_modules/kdbush/js/index.js'

import { globalEventBus } from "./eventBus.js";
import { readFileAsText } from "./utils.js";
import { rgb255String, rgb255Lerp, appleCrayonColorRGB255 } from './color.js';
import { contactFrequencyMapPanel } from './gui.js';

export let contactFrequencyDistanceThreshold = 256;

import { colorMapManager } from "./main.js";

const rgbMinContactFrequeny = appleCrayonColorRGB255('honeydew');
const rgbMaxContactFrequeny = appleCrayonColorRGB255('fern');

const rgbMin = appleCrayonColorRGB255('maraschino');
const rgbMax = appleCrayonColorRGB255('midnight');

class EnsembleManager {

    constructor () {
        this.stepSize = 3e4;
        this.path = undefined;
    }

    ingest(string){

        this.ensemble = {};

        const rawLines = string.split(/\r?\n/);

        // discard blurb
        rawLines.shift();

        // discard column titles
        rawLines.shift();

        // discard blank lines
        const lines = rawLines.filter(rawLine => "" !== rawLine);

        // chr-index ( 0-based)| segment-index (one-based) | Z | X | y

        let key;
        let trace;
        for (let line of lines) {

            let parts = line.split(',');

            if ('nan' === parts[ 2 ] || 'nan' === parts[ 3 ] || 'nan' === parts[ 4 ]) {
                // do nothing
            } else {

                const index = parseInt(parts[ 0 ], 10) - 1;

                if (undefined === key || key !== index.toString()) {

                    key = index.toString();

                    this.ensemble[ key ] = trace =
                        {
                            segmentIDList: [],
                            geometry: new THREE.Geometry(),
                            material: new THREE.MeshPhongMaterial()
                        };

                }

                // discard chr-index
                parts.shift();

                // discard segment-index
                let segmentID = parts.shift();

                // NOTE: Segment IDs are 1-based.
                trace.segmentIDList.push( parseInt(segmentID, 10) );

                let [ z, x, y ] = parts;
                const centroid = new THREE.Vector3(parseFloat(x), parseFloat(y), parseFloat(z));
                trace.geometry.vertices.push( centroid );


            }

        } // for (lines)

        const ensembleList = Object.values(this.ensemble);

        // compute and store bounds
        for (let trace of ensembleList) {
            trace.geometry.computeBoundingBox();
            trace.geometry.computeBoundingSphere();
        }

        contactFrequencyMapPanel.draw(getContactFrequencyCanvasWithEnsemble(this.ensemble, contactFrequencyMapPanel.distanceThreshold));

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

export const getBoundsWithTrace = (trace) => {
    const { center, radius } = trace.geometry.boundingSphere;
    const { min, max } = trace.geometry.boundingBox;
    return { min, max, center, radius }
};

export const getContactFrequencyCanvasWithEnsemble = (ensemble, distanceThreshold) => {

    const ensembleList = Object.values(ensemble);

    const maxTraceLength = Math.max(...(ensembleList.map(ensemble => ensemble.geometry.vertices.length)));

    console.time(`index ${ ensembleList.length } traces`);

    let frequencies = new Array(maxTraceLength * maxTraceLength);
    for (let f = 0; f < frequencies.length; f++) frequencies[ f ] = 0;

    let maxFrequency = Number.NEGATIVE_INFINITY;

    // compute and store bounds
    for (let trace of ensembleList) {

        // console.time(`index and process single traces`);

        let { vertices } = trace.geometry;
        let { length: traceLength } = vertices;

        const config =
            {
                idList: trace.segmentIDList,
                points: vertices,
                getX: pt => pt.x,
                getY: pt => pt.y,
                getZ: pt => pt.z,
                nodeSize: 64,
                ArrayType: Float64Array,
                axisCount: 3
            };

        const spatialIndex = new KDBush(config);

        for (let i = 0; i < traceLength; i++) {

            const { x, y, z } = vertices[ i ];

            const ids = spatialIndex.within(x, y, z, distanceThreshold);

            const traceSegmentID = trace.segmentIDList[ i ];
            const ids_filtered = ids.filter(id => id !== traceSegmentID);

            if (ids_filtered.length > 0) {
                for (let id of ids_filtered) {

                    // ids are segment indices which are 1-based. Decrement to use
                    // as index into frequency array which is 0-based
                    const id_freq = id - 1;
                    const  i_freq = traceSegmentID - 1;

                    const xy =  i_freq * maxTraceLength + id_freq;
                    const yx = id_freq * maxTraceLength +  i_freq;

                    ++frequencies[ xy ];
                    ++frequencies[ yx ];

                    maxFrequency = Math.max(maxFrequency, frequencies[ xy ]);

                }
            }

        }

        // console.timeEnd(`index and process single traces`);

    }

    console.timeEnd(`index ${ ensembleList.length } traces`);

    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    ctx.canvas.width = ctx.canvas.height = maxTraceLength;

    console.log('Contact map size: ' + ctx.canvas.width + ' x ' + ctx.canvas.height);
    // clear canvas
    const { width: w, height: h } = ctx.canvas;
    ctx.fillStyle = rgb255String( appleCrayonColorRGB255('snow') );
    ctx.fillRect(0, 0, w, h);

    // paint frequencies as lerp'd color
    for (let i = 0; i < w; i++) {
        for(let j = 0; j < h; j++) {

            const ij = i * w + j;
            const interpolant = i === j ? 1 :  frequencies[ ij ] / maxFrequency;
            // ctx.fillStyle = rgb255String( rgb255Lerp(rgbMinContactFrequeny, rgbMaxContactFrequeny, interpolant) );
            ctx.fillStyle = colorMapManager.retrieveRGB255String('bintu_et_al', interpolant);
            ctx.fillRect(i, j, 1, 1);
        }
    }

    return canvas;

};

export const getDistanceMapCanvasWithTrace = trace => {

    console.time('distance map for single trace');

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

    console.timeEnd('distance map for single trace');

    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    ctx.canvas.width = ctx.canvas.height = length;

    // clear canvas
    ctx.fillStyle = rgb255String( appleCrayonColorRGB255('snow') );
    ctx.fillRect(0, 0, length, length);

    // paint distances as lerp'd color
    for (let i = 0; i < length; i++) {
        for(let j = 0; j < length; j++) {

            const ij = i * length + j;
            const interpolant = distances[ ij ] / maxDistance;
            // ctx.fillStyle = rgb255String( rgb255Lerp(rgbMin, rgbMax, interpolant) );
            ctx.fillStyle = colorMapManager.retrieveRGB255String('bintu_et_al', interpolant);
            ctx.fillRect(i, j, 1, 1);
        }
    }

    return canvas;

};

export default EnsembleManager;
