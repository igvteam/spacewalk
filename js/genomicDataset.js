import Dataset from "./dataset.js";


class GenomicDataset extends Dataset {
    constructor() {
        super();
        this.traces = {};
        this.genomicStart = Number.POSITIVE_INFINITY;
        this.genomicEnd = Number.NEGATIVE_INFINITY;
        this.isPointCloud = undefined;
        this.chr = undefined;
        this.maximumSegmentID = undefined;
        this.genomicExtentList = undefined
    }

    consume(line, regex) {


        if (line.startsWith('trace')) {

            this.key = line.split(regex).join('%')
            this.traces[ this.key ] = {}
            this.genomicExtentList = []

        } else {

            let [ chr, startBP, endBP, x, y, z ] = line.split(regex)

            if (undefined === this.chr) {
                this.chr = chr;
            }

            startBP = parseInt(startBP, 10)
            endBP = parseInt(endBP, 10)

            const trace = this.traces[ this.key ]

            const traceKey = `${ startBP }%${ endBP }`

            if (undefined === trace[ traceKey ]) {
                trace[ traceKey ] = []
            }

            if (0 === trace[ traceKey ].length) {
                this.genomicExtentList.push({ startBP, endBP, centroidBP: Math.round((startBP + endBP) / 2.0), sizeBP: endBP - startBP })
            }

            this.genomicStart = Math.min(this.genomicStart, startBP);
            this.genomicEnd   = Math.max(this.genomicEnd,     endBP);

            if (false === [ x, y, z ].some(isNaN)) {
                trace[ traceKey ].push ({ x:parseFloat(x), y:parseFloat(y), z:parseFloat(z) });
            } else {
                trace[ traceKey ].push ({ x:'nan', y:'nan', z:'nan' });
            }


        }

    }

    postprocess() {

        let trace = Object.values(this.traces)[ 0 ];
        let list = Object.values(trace)[ 0 ];

        // consolidate non-pointcloud data.
        this.isPointCloud = (list.length > 1);
        if (false === this.isPointCloud) {

            for (let trace of Object.values(this.traces)) {

                if (undefined === this.maximumSegmentID) {
                    this.maximumSegmentID = Object.keys(trace).length;
                }

                for (let key of Object.keys(trace)) {
                    const [ { x, y, z } ] = trace[ key ];
                    trace[ key ] = { x, y, z }
                }

            } // for (Object.values(this.traces))

            for (let trace of Object.values(this.traces)) {

                const bbox =
                    {
                        min: [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY ],
                        max: [ Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY ],
                        centroid: [ 0, 0, 0 ],
                    }

                for (let { x, y, z } of Object.values(trace)) {
                    if ( ![ x, y, z ].some(isNaN) ) {
                        // min
                        bbox.min[ 0 ] = Math.min(bbox.min[ 0 ], x)
                        bbox.min[ 1 ] = Math.min(bbox.min[ 1 ], y)
                        bbox.min[ 2 ] = Math.min(bbox.min[ 2 ], z)

                        // max
                        bbox.max[ 0 ] = Math.max(bbox.max[ 0 ], x)
                        bbox.max[ 1 ] = Math.max(bbox.max[ 1 ], y)
                        bbox.max[ 2 ] = Math.max(bbox.max[ 2 ], z)
                    }
                }

                bbox.centroid[ 0 ] = (bbox.min[ 0 ] + bbox.max[ 0 ]) / 2.0
                bbox.centroid[ 1 ] = (bbox.min[ 1 ] + bbox.max[ 1 ]) / 2.0
                bbox.centroid[ 2 ] = (bbox.min[ 2 ] + bbox.max[ 2 ]) / 2.0

                for (let value of Object.values(trace)) {
                    if ([ value.x, value.y, value.z ].some(isNaN)) {
                        value.x = bbox.centroid[ 0 ]
                        value.y = bbox.centroid[ 1 ]
                        value.z = bbox.centroid[ 2 ]
                    }
                }

            }

        } // if (false === this.isPointCloud)

        for (let i = 0; i < this.genomicExtentList.length; i++) {
            const item = this.genomicExtentList[ i ]
            item.interpolant = (item.centroidBP - this.genomicStart) / (this.genomicEnd - this.genomicStart)
            item.start  = (item.startBP - this.genomicStart) / (this.genomicEnd - this.genomicStart)
            item.end    = (item.endBP   - this.genomicStart) / (this.genomicEnd - this.genomicStart)
        }

    }

    getLocus() {
        const { chr, genomicStart, genomicEnd } = this
        return { chr, genomicStart, genomicEnd }
    }

}

export default GenomicDataset;
