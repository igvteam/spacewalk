import * as THREE from "../node_modules/three/build/three.module.js";
import Globals from './globals.js';
import { readFileAsText } from "./utils.js";
import { appleCrayonRandomBrightColorThreeJS } from "./color.js";
import { defaultColormapName } from "./colorMapManager.js";

class PointCloudManager {

    constructor () {
        this.path = undefined;
    }

    ingest({ path, string }) {

        this.path = path;

        let raw = string.split(/\r?\n/);

        // discard blank lines
        let lines = raw.filter(line => "" !== line);

        // discard initial on-liner
        lines.shift();

        console.time(`ingest point-cloud with ${ lines.length } points`);

        let segments = {};

        for (let line of lines) {

            const tokens = line.split(',');
            const [ startBP, endBP, sizeKB ] = [ tokens[ 0 ], tokens[ 1 ], tokens[ 2 ], tokens[ 3 ], tokens[ 4 ], tokens[ 5 ] ];
            const key = startBP + '%' + endBP + '%' + sizeKB;

            if (undefined === segments[ key ]) {
                segments[ key ] = [];
            }

            segments[ key ].push(line);
        }

        const keys = Object.keys(segments);
        const [ startBP, endBP ] = keys.reduce((accumulator, key) => {

            const [ startBP, endBP, sizeKB ] = key.split('%');

            const ss = Math.min(accumulator[ 0 ], parseInt(startBP, 10));
            const ee = Math.max(accumulator[ 1 ], parseInt(  endBP, 10));
            accumulator = [ ss, ee ];

            return accumulator;

        }, [ Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY ]);

        // const startBP = keys[ 0 ].split('%')[ 0 ];
        // const endBP = keys[ keys.length - 1 ].split('%')[ 1 ];

        this.locus =  { chr: 'chr21', genomicStart: parseInt(startBP, 10), genomicEnd: parseInt(endBP, 10) };

        this.list = [];
        this.boundingBox = new THREE.Box3();
        this.boundingSphere = new THREE.Sphere();

        let xyz = new THREE.Vector3();

        const { genomicStart, genomicEnd } = this.locus;

        for (let key of keys) {

            const segment = segments[ key ];
            const [ startBP, endBP, sizeKB ] = key.split('%');

            let obj =
                {
                    geometry: new THREE.BufferGeometry(),
                    startBP: parseInt(startBP, 10),
                    endBP: parseInt(endBP, 10),
                    sizeBP: parseFloat(sizeKB) / 1e3
                };

            let xyzList = [];
            let rgbList = [];

            let bp = (obj.startBP + obj.endBP) / 2.0;
            let interpolant = (bp - genomicStart) / (genomicEnd - genomicStart);

            let color = Globals.colorMapManager.retrieveRGBThreeJS(defaultColormapName, interpolant);
            // let color = appleCrayonRandomBrightColorThreeJS();

            for (let line of segment) {

                const tokens = line.split(',');
                const [ x, y, z ] = [ tokens[ 3 ], tokens[ 4 ], tokens[ 5 ] ];

                xyzList.push(parseFloat(x), parseFloat(y), parseFloat(z));

                const { r, g, b } = color;
                rgbList.push(r, g, b);

                xyz.set(parseFloat(x), parseFloat(y), parseFloat(z));
                this.boundingBox.expandByPoint(xyz);

            }

            obj.geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( xyzList, 3 ) );
            obj.geometry.addAttribute(    'color', new THREE.Float32BufferAttribute( rgbList, 3 ) );
            obj.geometry.computeBoundingBox();
            obj.geometry.computeBoundingSphere();

            this.list.push(obj);

        }

        this.boundingBox.getBoundingSphere(this.boundingSphere);

        console.timeEnd(`ingest point-cloud with ${ lines.length } points`);

    }

    getBounds() {
        const { center, radius } = this.boundingSphere;
        const { min, max } = this.boundingBox;
        return { min, max, center, radius }
    };

    async loadURL ({ url, name }) {

        try {

            const string = await igv.xhr.load(url);
            const { file: path } = igv.parseUri(url);

            Globals.eventBus.post({ type: "DidLoadPointCloudFile", data: { path, string } });
        } catch (error) {
            console.warn(error.message);
        }

    }

    async loadLocalFile ({ file }) {

        try {
            const string = await readFileAsText(file);
            const { name: path } = file;

            Globals.eventBus.post({ type: "DidLoadPointCloudFile", data: { path, string } });
        } catch (e) {
            console.warn(e.message)
        }

    }

}

export const getBoundsWithPointCloud = mesh => {
    const { center, radius } = mesh.geometry.boundingSphere;
    const { min, max } = mesh.geometry.boundingBox;
    return { min, max, center, radius }
};

export default PointCloudManager;
