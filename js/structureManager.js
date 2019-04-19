import * as THREE from "./threejs_es6/three.module.js";

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
                        this.structures[ currentKey ] = { bbox: [], extent: [], centroid: [], cameraPosition: [], array: [] };
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

            // bounding hyper-rectangle
            const [ extentX, extentY, extentZ ] = [ maxX-minX, maxY-minY, maxZ-minZ ];
            structure.extent = new THREE.Vector3(extentX, extentY, extentZ);

            // longest edge
            const edgeLength = Math.max(structure.extent.x, structure.extent.y, structure.extent.z);

            // radius of bounding sphere
            structure.boundingRadius = Math.sqrt(3 * edgeLength * edgeLength);

            // Centroid of structure. Where we will aim the camera.
            const [ centroidX, centroidY, centroidZ ] = [ (maxX+minX)/2, (maxY+minY)/2, (maxZ+minZ)/2 ];
            structure.centroid = new THREE.Vector3(centroidX, centroidY, centroidZ);

            // where to position the camera. the camera with look at the centroid
            structure.cameraPosition = new THREE.Vector3(centroidX + structure.boundingRadius, centroidY + structure.boundingRadius, centroidZ + structure.boundingRadius);

        });

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
