import * as THREE from "../node_modules/three/build/three.module.js";
import Globals from './globals.js';
import igv from '../vendor/igv.esm.js'
import KDBush from '../node_modules/kd3d/js/index.js'
import { readFileAsText } from "./utils.js";
import { rgb255String, appleCrayonColorRGB255 } from './color.js';
import { contactFrequencyMapPanel } from './gui.js';

export let contactFrequencyDistanceThreshold = 256;

class EnsembleManager {

    constructor () {
        this.stepSize = 3e4;
    }

    ingest({ path, string }){

        this.locus = parsePathEncodedGenomicLocation(path);

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
        let counter;
        for (let line of lines) {

            let parts = line.split(',');

            const index = parseInt(parts[ 0 ], 10) - 1;

            if (undefined === key || key !== index.toString()) {

                key = index.toString();

                this.ensemble[ key ] = trace =
                    {
                        segmentList:[],
                        geometry: new THREE.Geometry(),
                        material: new THREE.MeshPhongMaterial()
                    };

                // capture the nominal trace length by recording the maximum possible number of segments
                if (counter && undefined === this.maximumSegmentID) {
                    this.maximumSegmentID = counter;
                }

                counter = 0;

            }

            if ('nan' === parts[ 2 ] || 'nan' === parts[ 3 ] || 'nan' === parts[ 4 ]) {
                // do nothing
            } else {

                // discard chr-index
                parts.shift();

                // capture segment-index
                let token = parts.shift();

                // NOTE: Segment ID is 1-based.
                const segmentID = parseInt(token, 10);
                const segmentIDIndex = segmentID - 1;
                const genomicLocation = this.locus.genomicStart + this.stepSize * (0.5 + segmentIDIndex);
                trace.segmentList.push( { segmentID, genomicLocation } );

                let [ z, x, y ] = parts;
                const centroid = new THREE.Vector3(parseFloat(x), parseFloat(y), parseFloat(z));
                trace.geometry.vertices.push( centroid );

            }

            ++counter;

        } // for (lines)

        const ensembleList = Object.values(this.ensemble);

        // compute and store bounds
        for (let trace of ensembleList) {
            trace.geometry.computeBoundingBox();
            trace.geometry.computeBoundingSphere();
        }

        contactFrequencyMapPanel.draw(getContactFrequencyCanvasWithEnsemble(this.ensemble, contactFrequencyMapPanel.distanceThreshold));

    }

    getTraceWithName(name) {
        // return this.ensemble[ name ] || undefined;
        return this.ensemble[ name ] || undefined;
    }

    describeTraceWithName(name) {

        const trace = this.getTraceWithName(name);

        for (let segment of trace.segmentList) {
            const star = segment.segmentID !== 1 + trace.segmentList.indexOf(segment) ? '(*)' : '';
            const str = `index ${ trace.segmentList.indexOf(segment) } segmentID ${ segment.segmentID } ${ star }`;
            console.log(str);
        }

    }

    segmentIDForGenomicLocation(bp) {

        let delta = Math.round(bp - this.locus.genomicStart);
        let segmentID = 1 + Math.floor(delta / this.stepSize);
        return segmentID;
    }

    async loadURL ({ url, name }) {

        try {

            let string = await igv.xhr.load(url);
            const { file:path } = igv.parseUri(url);

            const { chr, genomicStart, genomicEnd } = parsePathEncodedGenomicLocation(path);
            Globals.eventBus.post({ type: "DidLoadFile", data: { path, string, chr, genomicStart, genomicEnd } });

        } catch (error) {
            console.warn(error.message);
        }

    }

    async loadLocalFile ({ file }) {

        try {
            const string = await readFileAsText(file);
            const { name: path } = file;
            const { chr, genomicStart, genomicEnd } = parsePathEncodedGenomicLocation(path);
            Globals.eventBus.post({ type: "DidLoadFile", data: { path, string, chr, genomicStart, genomicEnd } });
        } catch (e) {
            console.warn(e.message)
        }

    }
}

export const parsePathEncodedGenomicLocation = path => {

    let dev_null;
    let parts = path.split('_');
    dev_null = parts.shift();
    let locus = parts[ 0 ];

    let [ chr, start, end ] = locus.split('-');

    dev_null = end.split(''); // 3 0 M b
    dev_null.pop(); // 3 0 M
    dev_null.pop(); // 3 0
    end = dev_null.join(''); // 30

    return { chr, genomicStart: parseInt(start) * 1e6, genomicEnd: parseInt(end) * 1e6 };
};

export const getBoundsWithTrace = (trace) => {
    const { center, radius } = trace.geometry.boundingSphere;
    const { min, max } = trace.geometry.boundingBox;
    return { min, max, center, radius }
};

export const getContactFrequencyCanvasWithEnsemble = (ensemble, distanceThreshold) => {

    const ensembleList = Object.values(ensemble);

    let mapSize = Globals.ensembleManager.maximumSegmentID;

    console.time(`index ${ ensembleList.length } traces`);

    let frequencies = new Array(mapSize * mapSize);
    for (let f = 0; f < frequencies.length; f++) frequencies[ f ] = 0;

    let maxFrequency = Number.NEGATIVE_INFINITY;

    // compute and store bounds
    for (let trace of ensembleList) {

        // console.time(`index and process single traces`);

        const spatialIndex = new KDBush(kdBushConfguratorWithTrace(trace));

        let { vertices } = trace.geometry;
        for (let i = 0; i < vertices.length; i++) {

            const { x, y, z } = vertices[ i ];

            const ids = spatialIndex.within(x, y, z, distanceThreshold);

            const traceSegmentID = trace.segmentList[ i ].segmentID;
            const ids_filtered = ids.filter(id => id !== traceSegmentID);

            if (ids_filtered.length > 0) {
                for (let id of ids_filtered) {

                    // ids are segment indices which are 1-based. Decrement to use
                    // as index into frequency array which is 0-based
                    const id_freq = id - 1;
                    const  i_freq = traceSegmentID - 1;

                    const xy =  i_freq * mapSize + id_freq;
                    if (xy > frequencies.length) {
                        console.log('xy is bogus index ' + xy);
                    }
                    const yx = id_freq * mapSize +  i_freq;

                    if (yx > frequencies.length) {
                        console.log('yx is bogus index ' + yx);
                    }

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
    ctx.canvas.width = ctx.canvas.height = mapSize;

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
            // ctx.fillStyle = Globals.colorMapManager.retrieveRGB255String('bintu_et_al', interpolant);
            ctx.fillStyle = Globals.colorMapManager.retrieveRGB255String('juicebox_default', interpolant);
            ctx.fillRect(i, j, 1, 1);
        }
    }

    return canvas;

};

export const getDistanceMapCanvasWithTrace = trace => {

    let str = `distance map for trace with ${ trace.geometry.vertices.length } vertices`;
    console.time(str);

    const ensembleList = Object.values(Globals.ensembleManager.ensemble);

    let mapSize = Globals.ensembleManager.maximumSegmentID;

    let distances = new Array(mapSize * mapSize);
    for (let d = 0; d < distances.length; d++) distances[ d ] = 0;

    let maxDistance = Number.NEGATIVE_INFINITY;

    let { vertices } = trace.geometry;
    let { length } = vertices;
    for (let i = 0; i < length; i++) {

        const candidate = vertices[ i ];
        const i_segmentIDIndex = trace.segmentList[ i ].segmentID - 1;

        for (let j = 0; j < length; j++) {

            const centroid = vertices[ j ];
            const j_segmentIDIndex = trace.segmentList[ j ].segmentID - 1;

            const ij =  i_segmentIDIndex * mapSize + j_segmentIDIndex;
            const ji =  j_segmentIDIndex * mapSize + i_segmentIDIndex;

            if (i_segmentIDIndex === j_segmentIDIndex) {
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

    }

    console.timeEnd(str);

    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    ctx.canvas.width = ctx.canvas.height = mapSize;

    console.log('Distance map size: ' + ctx.canvas.width + ' x ' + ctx.canvas.height);

    // clear canvas
    const { width: w, height: h } = ctx.canvas;
    ctx.fillStyle = rgb255String( appleCrayonColorRGB255('snow') );
    ctx.fillRect(0, 0, w, h);

    // paint distances as lerp'd color
    for (let i = 0; i < w; i++) {

        for(let j = 0; j < h; j++) {

            const ij = i * w + j;
            const interpolant = distances[ ij ] / maxDistance;
            // ctx.fillStyle = Globals.colorMapManager.retrieveRGB255String('bintu_et_al', interpolant);
            ctx.fillStyle = Globals.colorMapManager.retrieveRGB255String('juicebox_default', interpolant);
            ctx.fillRect(i, j, 1, 1);
        }

    }

    return canvas;

};

const kdBushConfguratorWithTrace = trace => {

    return {
        idList: trace.segmentList.map(segment => segment.segmentID),
        points: trace.geometry.vertices,
        getX: pt => pt.x,
        getY: pt => pt.y,
        getZ: pt => pt.z,
        nodeSize: 64,
        ArrayType: Float64Array,
        axisCount: 3
    }

};

export default EnsembleManager;
