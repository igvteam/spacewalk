import * as THREE from "../node_modules/three/build/three.module.js";
import igv from '../vendor/igv.esm.js'
import { globalEventBus } from "./eventBus.js";
import { readFileAsText } from "./utils.js";

class EnsembleManager {

    constructor () {
        this.stepSize = 3e4;
        this.path = undefined;
    }

    ingest(string){

        let t;
        let dt;

        this.ensemble = {};

        const lines = string.split(/\r?\n/);

        // discard blurb
        lines.shift();

        // discard column titles
        lines.shift();

        // chr-index ( 0-based)| segment-index (one-based) | Z | X | y

        t = Date.now();

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

        dt = Date.now() - t;

        console.log('parse of ensemble file done ' + dt + ' msec.');

        t = Date.now();

        // let ensembleContainer = new THREE.Object3D();
        Object.values(this.ensemble).forEach((trace, index) => {

            let t;
            let dt;

            t = Date.now();

            let distances = [];
            let { vertices } = trace.geometry;
            for (let i = 0; i < vertices.length; i++) {

                const candidate = vertices[ i ];

                for (let j = 0; j < vertices.length; j++) {

                    const centroid = vertices[ j ];

                    if (candidate === centroid) {
                        // const i = trace.centroids.indexOf(candidate);
                        // const j = trace.centroids.indexOf(centroid);
                        // console.log('self intersection at ' + i + ' ' + j);
                    } else {
                        const distance = candidate.distanceTo(centroid);
                        distances.push({ i, j, distance });
                    }
                }
            }

            trace.geometry.computeBoundingBox();
            trace.geometry.computeBoundingSphere();

            // let texture = createDataTexture(512, 512, undefined);
            // let json = texture.toJSON();
            // let material = new THREE.MeshPhongMaterial({ map: texture });
            //

            // let mesh = new THREE.Mesh(traceGeometry, material);
            // let mesh = new THREE.Mesh(trace.geometry);

            // ensembleContainer.add( mesh );

            dt = Date.now() - t;
            // console.log('trace ' + index + '. pair-wise distance calc. ' + dt + ' msec.');


        }); // foreach(trace)

        dt = Date.now() - t;

        const count = Object.values(this.ensemble).length;
        console.log('ensemble pair-wise distance calculation for ' + count + ' traces: ' + dt + ' msec.');

        // return ensembleContainer.toJSON();

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

export default EnsembleManager;
