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
    }

    getLocus() {
        const { chr, genomicStart, genomicEnd } = this;
        return { chr, genomicStart, genomicEnd }
    };

    consume(line, regex) {

        if (line.startsWith('trace')) {
            this.key = line.split(regex).join('%');
            this.traces[ this.key ] = {};
        } else {

            let [ chr, startBP, endBP, x, y, z ] = line.split(regex);

            if (undefined === this.chr) {
                this.chr = chr;
            }

            let trace = this.traces[ this.key ];
            const traceKey = `${ startBP }%${ endBP }`;
            if (undefined === trace[ traceKey ]) {
                trace[ traceKey ] = [];
            }

            startBP = parseInt(startBP, 10);
            endBP = parseInt(endBP, 10);

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

            }

        }
    }
}

export default GenomicDataset;
