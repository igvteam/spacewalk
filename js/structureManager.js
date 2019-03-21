import { numberFormatter } from './utils.js';
class StructureManager {

    constructor () {
        this.path = undefined;
    }

    async loadSegments({ path}) {

        this.path = path;

        const response = await fetch(path);
        const text = await response.text();
        this.ingest(text);
    }

    ingest(string) {
        this.stepSize = 3e4;
        this.structures = {};
        const lines = string.split(/\r?\n/);

        // discard blurb
        lines.shift();

        // discard column titles
        lines.shift();

        // chr index | segment index | Z | X | y
        let [ currentStructureKey, structureKey ] = [ undefined, undefined ];

        for (let line of lines) {

            if ("" === line) {
                // do nothing
                // console.log('ignore blank line');
            } else {

                const parts = line.split(',');

                const number = parseInt(parts[ 0 ], 10) - 1;

                structureKey = number.toString();

                if (undefined === currentStructureKey || currentStructureKey !== structureKey) {
                    currentStructureKey = structureKey;

                    this.structures[ currentStructureKey ] = { bbox: [], extent: [], centroid: [], cameraPosition: [], array: [] };
                }

                const segmentIndex = parseInt(parts[1]);


                // discard chr index
                parts.shift();

                // discard segment index
                parts.shift();

                let [ z, x, y ] = parts.map((token) => { return 'nan' === token ? NaN : parseFloat(token); });
                this.structures[ currentStructureKey ].array.push({ structureKey: structureKey, segmentIndex: segmentIndex, xyz: [ x, y, z ] });

            }

        }

        Object.values(this.structures).forEach(structure => {

            const [ minX, minY, minZ, maxX, maxY, maxZ ] = structure.array.map(items => items.xyz).reduce((accumulator, xyz) => {

                const doSkip = isNaN(xyz[ 0 ])|| isNaN(xyz[ 1 ]) || isNaN(xyz[ 2 ]);

                if (!doSkip) {
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
                }

                return accumulator;

            }, [ Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE ]);

            // bbox
            // structure.bbox = [ minX, maxX, minY, maxY, minZ, maxZ ];

            // bounding hyper-rectangle
            const [ extentX, extentY, extentZ ] = [ maxX-minX, maxY-minY, maxZ-minZ ];
            structure.extent = [ extentX, extentY, extentZ ];

            // longest edge
            const edgeLength = Math.max(...structure.extent);

            // radius of bounding sphere
            structure.boundingRadius = Math.sqrt(3 * edgeLength * edgeLength);

            // Centroid of structure. Where we will aim the camera.
            const [ centroidX, centroidY, centroidZ ] = [ (maxX+minX)/2, (maxY+minY)/2, (maxZ+minZ)/2 ];
            structure.centroid = [ centroidX, centroidY, centroidZ ];

            // console.log('radius ' + numberFormatter(Math.round(structure.boundingRadius)) + ' centroid ' + numberFormatter(Math.round(centroidX)) + ' ' + numberFormatter(Math.round(centroidY)) + ' ' + numberFormatter(Math.round(centroidZ)));

            // where to position the camera. the camera with look at the centroid
            structure.cameraPosition = [ centroidX + structure.boundingRadius, centroidY + structure.boundingRadius, centroidZ + structure.boundingRadius ];

        });

    }

    structureWithName(name) {
        return this.structures[ name ] || undefined;
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
