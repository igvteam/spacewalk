import * as THREE from "./threejs_es6/three.module.js";
import igv from '../vendor/igv.esm.js';
// import igv from 'https://cdn.jsdelivr.net/npm/igv@2.2.9/dist/igv.esm.js';
import {globalEventBus} from "./eventBus.js";
import { readFileAsText } from "./utils.js";

class StructureManager {

    constructor () {
        this.stepSize = 3e4;
        this.path = undefined;
    }

    ingest(string) {
        this.structures = {};
        const lines = string.split(/\r?\n/);

        // discard blurb
        lines.shift();

        // discard column titles
        lines.shift();

        // chr-index ( 0-based)| segment-index (one-based) | Z | X | y

        let currentKey;
        let list;
        for (let line of lines) {

            if ("" !== line) {

                let parts = line.split(',');

                if ('nan' === parts[ 2 ] || 'nan' === parts[ 3 ] || 'nan' === parts[ 4 ]) {
                    // do nothing
                } else {

                    const key = parseInt(parts[ 0 ], 10) - 1;

                    if (undefined === currentKey || currentKey !== key) {
                        currentKey = key;
                        this.structures[ currentKey ] = { bbox: {}, extent: [], centroid: [], cameraDistance: undefined, cameraPosition: [], array: [] };
                        list = this.structures[ currentKey ].array;
                    }

                    // discard chr-index
                    parts.shift();

                    // discard segment-index
                    parts.shift();

                    let [ z, x, y ] = parts;
                    let obj = { xyz: [ parseFloat(x), parseFloat(y), parseFloat(z) ] };

                    list.push(obj);
                    obj.segmentIndex = 1 + list.indexOf(obj);
                }

            }

        }

        Object.values(this.structures).forEach(structure => {

            const [ minX, minY, minZ, maxX, maxY, maxZ ] = structure.array.map(items => items.xyz).reduce((accumulator, xyz) => {

                accumulator =
                    [
                        // min
                        Math.min(accumulator[ 0 ], xyz[ 0 ]),
                        Math.min(accumulator[ 1 ], xyz[ 1 ]),
                        Math.min(accumulator[ 2 ], xyz[ 2 ]),

                        // max
                        Math.max(accumulator[ 3 ], xyz[ 0 ]),
                        Math.max(accumulator[ 4 ], xyz[ 1 ]),
                        Math.max(accumulator[ 5 ], xyz[ 2 ]),
                    ];

                return accumulator;

            }, [ Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE ]);

            // bbox
            structure.bbox = { min: new THREE.Vector3(minX, minY, minZ), max: new THREE.Vector3(maxX, maxY, maxZ) };

            const [ extentX, extentY, extentZ ] = [ maxX - minX, maxY - minY, maxZ - minZ ];
            structure.extent = new THREE.Vector3(extentX, extentY, extentZ);

            // longest edge
            const edgeLength = Math.max(structure.extent.x, structure.extent.y, structure.extent.z);

            // radius of bounding sphere
            structure.boundingRadius = Math.sqrt(3 * edgeLength * edgeLength);

            // Centroid of structure. Where we will aim the camera.
            const [ centroidX, centroidY, centroidZ ] = [ (maxX+minX)/2, (maxY+minY)/2, (maxZ+minZ)/2 ];
            structure.centroid = new THREE.Vector3(centroidX, centroidY, centroidZ);

            // Nice camera position. Point camera at centroid from the positive x-y-z quadrant.
            structure.cameraPosition = new THREE.Vector3(centroidX + structure.boundingRadius, centroidY + structure.boundingRadius, centroidZ + structure.boundingRadius);

        });

    }

    static getCameraPoseAlongAxis ({ structure, axis, scaleFactor }) {

        const dimen = scaleFactor * structure.boundingRadius;
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

        const target = structure.centroid;

        position.addVectors(target, vector);

        return { target, position }
    }

    structureWithName(name) {
        return this.structures[ name ] || undefined;
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

export let parsePathEncodedGenomicLocation = path => {

    let dev_null;
    let parts = path.split('_');
    dev_null = parts.shift();
    let locus = parts[ 0 ];

    let [ chr, start, end ] = locus.split('-');

    dev_null = end.split(''); // 3 0 M b
    dev_null.pop(); // 3 0 M
    dev_null.pop(); // 3 0
    end = dev_null.join(''); // 30

    return [ chr, parseInt(start) * 1e6, parseInt(end) * 1e6 ];
};

export default StructureManager;
