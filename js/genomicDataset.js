import Dataset from './dataset.js';

class GenomicDataset extends Dataset {

    constructor() {
        super();

        this.traces = {}

        this.genomicStart = Number.POSITIVE_INFINITY;
        this.genomicEnd = Number.NEGATIVE_INFINITY;

        this.isPointCloud = undefined;

        this.chr = undefined;

        this.traceLength = undefined
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
                trace[ traceKey ].push ({ x:'nan', y:'nan', z:'nan', isMissingData:true });
            }


        }

    }

    postprocess() {

        let [ anyTrace ] = Object.values(this.traces)
        let [ vertices ] = Object.values(anyTrace)

        this.locus = { chr: this.chr, genomicStart: this.genomicStart, genomicEnd: this.genomicEnd }

        this.isPointCloud = (vertices.length > 1)

        if (true === this.isPointCloud) {
            for (let trace of Object.values(this.traces)) {
                for (let vertices of Object.values(trace)) {
                    const filtered = vertices.filter(({ isMissingData }) => {
                        if (true === isMissingData) {
                            console.warn('is missing data')
                            return false
                        } else {
                            return true
                        }
                    })
                    vertices = filtered.slice()
                }
            }
        } else {

            // consolidate non-pointcloud data.
            for (let trace of Object.values(this.traces)) {

                if (undefined === this.traceLength) {
                    this.traceLength = Object.keys(trace).length;
                }

                for (let key of Object.keys(trace)) {
                    const [ item ] = trace[ key ]
                    trace[ key ] = { x:item.x, y:item.y, z:item.z, isMissingData: item.isMissingData }
                }
            }

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
                    if (true === value.isMissingData) {
                        value.x = bbox.centroid[ 0 ]
                        value.y = bbox.centroid[ 1 ]
                        value.z = bbox.centroid[ 2 ]
                    }
                }

            }

        }

        for (let i = 0; i < this.genomicExtentList.length; i++) {
            const item = this.genomicExtentList[ i ]
            item.interpolant = (item.centroidBP - this.genomicStart) / (this.genomicEnd - this.genomicStart)
            item.start  = (item.startBP - this.genomicStart) / (this.genomicEnd - this.genomicStart)
            item.end    = (item.endBP   - this.genomicStart) / (this.genomicEnd - this.genomicStart)
        }

    }

    getTraceList() {
        return Object.values(this.traces)
    }

    getTraceRowXYZList(trace) {
        return Object.values(trace)
    }

    getLocus() {
        const { chr, genomicStart, genomicEnd } = this
        return { chr, genomicStart, genomicEnd }
    }
}

export default GenomicDataset
