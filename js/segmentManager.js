import BedTrack from "./igv/bedTrack.js";
import * as THREE from "./threejs_es6/three.module.js";

class SegmentManager {

    constructor () {
        // do constructor things
    }

    async loadSequence({ path }) {

        this.path = path;
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

        let dev_null;

        let keys = Object.keys(this.segments);

        for (let key of keys) {

            const list = this.segments[ key ].map(seg => seg.xyz);


            // min x
            dev_null = list
                .filter(( xyz ) => { return !isNaN(xyz[ 0 ]) && !isNaN(xyz[ 1 ]) && !isNaN(xyz[ 2 ]); })
                .map((xyz) => { return xyz[ 0 ] });
            const minX = Math.min(...dev_null);


            // min y
            dev_null = list
                .filter(( xyz ) => { return !isNaN(xyz[ 1 ]) && !isNaN(xyz[ 1 ]) && !isNaN(xyz[ 2 ]); })
                .map((xyz) => { return xyz[ 1 ] });
            const minY = Math.min(...dev_null);


            // min z
            dev_null = list
                .filter(( xyz ) => { return !isNaN(xyz[ 2 ]) && !isNaN(xyz[ 1 ]) && !isNaN(xyz[ 2 ]); })
                .map((xyz) => { return xyz[ 2 ] });
            const minZ = Math.min(...dev_null);

            // max x
            dev_null = list
                .filter(( xyz ) => { return !isNaN(xyz[ 0 ]) && !isNaN(xyz[ 1 ]) && !isNaN(xyz[ 2 ]); })
                .map((xyz) => { return xyz[ 0 ] });
            const maxX = Math.max(...dev_null);


            // max y
            dev_null = list
                .filter(( xyz ) => { return !isNaN(xyz[ 1 ]) && !isNaN(xyz[ 1 ]) && !isNaN(xyz[ 2 ]); })
                .map((xyz) => { return xyz[ 1 ] });
            const maxY = Math.max(...dev_null);


            // max z
            dev_null = list
                .filter(( xyz ) => { return !isNaN(xyz[ 2 ]) && !isNaN(xyz[ 1 ]) && !isNaN(xyz[ 2 ]); })
                .map((xyz) => { return xyz[ 2 ] });
            const maxZ = Math.max(...dev_null);

            // bbox
            this.segments[ key ].bbox   = [ minX, maxX, minY, maxY, minZ, maxZ ];

            // target - centroid of molecule. where will will aim the camera
            const [ targetX, targetY, targetZ ] = [ (maxX+minX)/2, (maxY+minY)/2, (maxZ+minZ)/2 ];
            this.segments[ key ].target = [ targetX, targetY, targetZ ];

            // size of bounding cube
            const [ extentX, extentY, extentZ ] = [ maxX-minX, maxY-minY, maxZ-minZ ];
            this.segments[ key ].extent = [ extentX, extentY, extentZ ];

            // where to position the camera. the camera with look at the target
            this.segments[ key ].cameraPosition = [ targetX - extentX, targetY + extentY, targetZ - extentZ ];

        }

    }

    // Compute the segment indexes containing a feature.  Quick hack, this is not the right place to do this but
    // I don't know how to change sphere color after its placed in scene
    async loadDemoTrack({ path }) {

        const [ genomicChr, genomicStart, genomicStep ] = [ "chr21", 28000071, 30000 ]

        this.featureSegmentIndexes = new Set()

        this.bedTrack = new BedTrack(path)

        const bedFeatures = await this.bedTrack.getFeatures(genomicChr)

        for (let feature of bedFeatures) {

            // Segment index (first sgement is 1)
            const idx = Math.floor((feature.start - genomicStart) / genomicStep) + 1

            if(idx >= 0) {
                // console.log(idx + "  " + (genomicStart + (idx-1)*( genomicStep)) + "-" + (genomicStart + idx*genomicStep))
                this.featureSegmentIndexes.add(idx)
            }
        }

    }

    materialForFeatureSegmentIndex(index) {


        const step = index / 60
        const ramp = Math.floor(Math.min(255, step * 255));

        const [ red, green, blue ] = [ ramp, 0, 255 - ramp ];

        return new THREE.MeshBasicMaterial({ color: new THREE.Color( this.featureSegmentIndexes.has(index) ? 'rgb(0, 255, 0)' : `rgb(${red},${green},${blue})` ) });
    }

    segmentWithName(name) {
        return this.segments[ name ] || undefined;
    }
}

export default SegmentManager;
