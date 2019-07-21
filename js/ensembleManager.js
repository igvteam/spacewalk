import * as THREE from "../node_modules/three/build/three.module.js";
import Globals from './globals.js';
import igv from '../vendor/igv.esm.js'
import { distanceMapPanel, contactFrequencyMapPanel } from './gui.js';
import { getEnsembleAverageDistanceCanvas } from './distanceMapPanel.js';
import { getEnsembleContactFrequencyCanvas } from './contactFrequencyMapPanel.js';
import { readFileAsText } from "./utils.js";

class EnsembleManager {

    constructor () {
        this.stepSize = 3e4;
    }

    ingestSW({ locus, hash }) {

        this.locus = locus;

        // maximumSegmentID is used to size the distance and contact maps which
        // are N by N where N = maximumSegmentID.
        // Because trace data often has missing xyz values the total number of
        // segments cannot be assumed to be the same for each trace in the ensemble.
        // We use  maximumSegmentID to ensure all traces will map to the contact
        // and distance maps.
        this.maximumSegmentID = undefined;

        let dictionary = {};
        for (let [hashKey, trace] of Object.entries(hash)) {

            // console.log(`:::::::::::::::::::: ${ hashKey } ::::::::::::::::::::`);

            if (undefined === this.maximumSegmentID) {
                this.maximumSegmentID = Object.keys(trace).length;
            }

            const segments = Object.values(trace);
            for (let segment of segments) {

                let { startBP, endBP, x, y, z } = segment[ 0 ];
                if (x /* && y && y */) {

                    const genomicLocation = (parseFloat(startBP) + parseFloat(endBP)) / 2.0;

                    x = parseFloat(x);
                    y = parseFloat(y);
                    z = parseFloat(z);

                    let segmentID = 1 + segments.indexOf(segment);
                    segmentID = segmentID.toString();

                    const key = hashKey.split('%').pop();

                    if (undefined === dictionary[ key ]) {
                        dictionary[ key ] = [];
                    }

                    dictionary[ key ].push({ segmentID, genomicLocation, x, y, z })

                }
            }
        }

        let keys = Object.keys(dictionary);

        // transform and augment dictionary into ensemble
        this.ensemble = {};
        for (let key of keys) {

            let list = dictionary[ key ];

            let segmentList = list.map(o => {
                let { segmentID, genomicLocation } = o;
                return { segmentID, genomicLocation }
            });

            let geometry = new THREE.Geometry();

            geometry.vertices = list.map(o => {
                let { x, y, z } = o;
                return new THREE.Vector3(x, y, z);
            });

            geometry.computeBoundingBox();
            geometry.computeBoundingSphere();

            let material = new THREE.MeshPhongMaterial();

            this.ensemble[ key ] = { segmentList, geometry, material };
        }

        dictionary = null;

        // update ensemble level contact frequency map
        contactFrequencyMapPanel.drawEnsembleContactFrequency(getEnsembleContactFrequencyCanvas(this.ensemble, contactFrequencyMapPanel.distanceThreshold));
        // segmentIDSanityCheck(this.ensemble);

        // update ensemble level distance map
        distanceMapPanel.drawEnsembleDistanceCanvas(getEnsembleAverageDistanceCanvas(this.ensemble));

        const { chr, genomicStart, genomicEnd } = locus;

        Globals.eventBus.post({ type: "DidLoadFile", data: { chr, genomicStart, genomicEnd, initialKey: '0' } });

    }

    DEPRICATED_ingest({ path, string }){

        this.locus = parsePathEncodedGenomicLocation(path);
        this.path = path;

        let raw = string.split(/\r?\n/);

        // discard blurb
        raw.shift();

        // discard column titles
        raw.shift();

        // discard blank lines
        const lines = raw.filter(rawLine => "" !== rawLine);
        raw = null;

        console.time(`ingest ensemble data with ${ lines.length } lines`);

        // maximumSegmentID is used to size the distance and contact maps which
        // are N by N where N = maximumSegmentID.
        // Because trace data often has missing xyz values the total number of
        // segments cannot be assumed to be the same for each trace in the ensemble.
        // We use  maximumSegmentID to ensure all traces will map to the contact
        // and distance maps.
        this.maximumSegmentID = Number.NEGATIVE_INFINITY;

        // build scratch dictionary
        let dictionary = {};
        for (let line of lines) {

            const tokens = line.split(',');

            // chr-index (1-based) | segment-index (1-based) | Z | X | Y
            let [ chromosomeID, segmentIDString, z, x, y ] = [ tokens[ 0 ], tokens[ 1 ], tokens[ 2 ], tokens[ 3 ], tokens[ 4 ] ];

            let segmentID = parseInt(segmentIDString, 10);

            // The chromosome id is 1-based. We use it for a key but make it 0-based.
            let number = parseInt(chromosomeID, 10) - 1;
            let key = number.toString();

            if (undefined === dictionary[ key ]) {
                dictionary[ key ] = [];
            }

            if ('nan' === x || 'nan' === y || 'nan' === z) {
                // do nothing
            } else {

                this.maximumSegmentID = Math.max(this.maximumSegmentID, segmentID);

                const genomicLocation = this.locus.genomicStart + this.stepSize * (0.5 + (segmentID - 1));
                dictionary[ key ].push({ segmentID, genomicLocation, x: parseFloat(x), y: parseFloat(y), z: parseFloat(z) })
            }
        }

        let keys = Object.keys(dictionary);

        // transform and augment dictionary into ensemble
        this.ensemble = {};
        for (let key of keys) {

            let list = dictionary[ key ];

            let segmentList = list.map(o => {
                let { segmentID, genomicLocation } = o;
                return { segmentID, genomicLocation }
            });

            let geometry = new THREE.Geometry();

            geometry.vertices = list.map(o => {
                let { x, y, z } = o;
                return new THREE.Vector3(x, y, z);
            });

            geometry.computeBoundingBox();
            geometry.computeBoundingSphere();

            let material = new THREE.MeshPhongMaterial();

            this.ensemble[ key ] = { segmentList, geometry, material };
        }

        dictionary = null;

        console.timeEnd(`ingest ensemble data with ${ lines.length } lines`);

        // update ensemble level contact frequency map
        contactFrequencyMapPanel.drawEnsembleContactFrequency(getEnsembleContactFrequencyCanvas(this.ensemble, contactFrequencyMapPanel.distanceThreshold));
        // segmentIDSanityCheck(this.ensemble);

        // update ensemble level distance map
        distanceMapPanel.drawEnsembleDistanceCanvas(getEnsembleAverageDistanceCanvas(this.ensemble));

        const { chr, genomicStart, genomicEnd } = this.locus;

        Globals.eventBus.post({ type: "DidLoadFile", data: { chr, genomicStart, genomicEnd, initialKey: '0' } });

    }

    getTraceWithName(name) {
        return this.ensemble[ name ] || undefined;
    }

    segmentIDForGenomicLocation(bp) {

        let delta = Math.round(bp - this.locus.genomicStart);
        let segmentID = 1 + Math.floor(delta / this.stepSize);
        return segmentID;
    }

    async loadURL ({ url, name }) {

        let string = undefined;
        try {
            string = await igv.xhr.load(url);
        } catch (e) {
            console.warn(e.message)
        }

        const { file: path } = igv.parseUri(url);
        this.ingest({ path, string });
    }

    async loadLocalFile ({ file }) {

        let string = undefined;
        try {
            string = await readFileAsText(file);
        } catch (e) {
            console.warn(e.message)
        }

        const { name: path } = file;
        this.ingest({ path, string });

    }

    reportFileLoadError(name) {
        return `EnsembleManager: Error loading ${ name }`
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

const segmentIDSanityCheck = ensemble => {

    const ensembleList = Object.values(ensemble);

    let mapSize = Globals.ensembleManager.maximumSegmentID;

    let matrix = new Array(mapSize * mapSize);
    for (let f = 0; f < matrix.length; f++) matrix[ f ] = 0;

    console.time(`segmentIDSanityCheck. ${ ensembleList.length } traces.`);

    for (let trace of ensembleList) {

        let { vertices } = trace.geometry;
        for (let i = 0; i < vertices.length; i++) {

            if (trace.segmentList[ i ].segmentID > Globals.ensembleManager.maximumSegmentID) {
                console.log(`Bogus Segment ID. trace ${ ensembleList.indexOf(trace) } vertex ${ i } segmentID ${ trace.segmentList[ i ].segmentID } maximumSegmentID ${ Globals.ensembleManager.maximumSegmentID }`);
            }
            const segmentID = trace.segmentList[ i ].segmentID;
            const  index = segmentID - 1;

            const xy = index * mapSize + index;
            if (xy > matrix.length) {
                console.log('xy is bogus index ' + xy);
            }

        }

    }

    console.timeEnd(`segmentIDSanityCheck. ${ ensembleList.length } traces.`);

};

export default EnsembleManager;
