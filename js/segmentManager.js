
import { globalEventBus } from './main.js';

class SegmentManager {

    constructor () {
        [ this.chr, this.genomicStart, this.genomicEnd ] = [ undefined, undefined, undefined ];
    }

    async loadSegments({path}) {

        this.path = path;
        [ this.chr, this.genomicStart, this.genomicEnd ] = parsePathEncodedGenomicLocation(path);

        this.segments = {};
        const response = await fetch(path);
        const text = await response.text();
        const lines = text.split(/\r?\n/);

        // discard blurb
        lines.shift();

        // discard column titles
        lines.shift();

        // chr index | segment index | Z | X | y
        let [ chrIndexCurrent, molIndex ] = [ undefined, undefined ];

        for (let line of lines) {

            if ("" === line) {
                // do nothing
                // console.log('ignore blank line');
            } else {

                const parts = line.split(',');

                const index = parseInt(parts[ 0 ], 10) - 1;

                molIndex = index.toString();

                if (undefined === chrIndexCurrent || chrIndexCurrent !== molIndex) {
                    chrIndexCurrent = molIndex;

                    this.segments[ chrIndexCurrent ] = [];
                }

                const segIndex = parseInt(parts[1])


                // discard chr index
                parts.shift();

                // discard segment index
                parts.shift();

                let [ z, x, y ] = parts.map((token) => { return 'nan' === token ? NaN : parseFloat(token); });
                this.segments[ chrIndexCurrent ].push({ molIndex: molIndex, segmentIndex: segIndex, xyz: [ x, y, z ] });

            }

        }

        Object.values(this.segments).forEach(segment => {

            const [ minX, minY, minZ, maxX, maxY, maxZ ] = segment.map(seg => seg.xyz).reduce((accumulator, xyz) => {

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
            segment.bbox = [ minX, maxX, minY, maxY, minZ, maxZ ];

            // size of bounding hyper-rectangle
            const [ extentX, extentY, extentZ ] = [ maxX-minX, maxY-minY, maxZ-minZ ];
            segment.extent = [ extentX, extentY, extentZ ];

            const maxExtent = Math.max([ extentX, extentY, extentZ ]);
            segment.boundingCube = [ maxExtent, maxExtent, maxExtent ];
            segment.boundingSphere = Math.sqrt(3) * maxExtent;

            // Centroid of molecule. where will will aim the camera
            const [ centroidX, centroidY, centroidZ ] = [ (maxX+minX)/2, (maxY+minY)/2, (maxZ+minZ)/2 ];
            segment.centroid = [ centroidX, centroidY, centroidZ ];

            // where to position the camera. the camera with look at the centroid
            segment.cameraPosition = [ centroidX - extentX, centroidY + extentY, centroidZ - extentZ ];


        });

        globalEventBus.post({type: "DidLoadSegments", data: path });
    }

    segmentWithName(name) {
        return this.segments[ name ] || undefined;
    }
}

let parsePathEncodedGenomicLocation = path => {

    let locus = path.split('_').pop().split('.').shift();

    let [ chr, start, end ] = locus.split('-');

    let dev_null = end.split(''); // 3 0 M b
    dev_null.pop(); // 3 0 M
    dev_null.pop(); // 3 0
    end = dev_null.join(''); // 30

    return [ chr, parseInt(start) * 1e6, parseInt(end) * 1e6 ];
};

export default SegmentManager;
