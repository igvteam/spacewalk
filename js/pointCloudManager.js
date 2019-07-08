import * as THREE from "../node_modules/three/build/three.module.js";
import igv from "../vendor/igv.esm.js";
import Globals from './globals.js';
import { defaultColormapName } from "./colorMapManager.js";
import { appleCrayonColorThreeJS } from "./color.js";
import { readFileAsText, numberFormatter } from "./utils.js";

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
                // console.log(`point cloud manager step size ${ numberFormatter( parseInt(sizeKB, 10) )} kb.`);
                segments[ key ] = [];
            }

            segments[ key ].push(line);
        }

        // sorted key list
        const keys = Object
            .keys(segments)
            .sort((a, b) => {
                const aa = a.split('%')[ 0 ];
                const bb = b.split('%')[ 0 ];
                return parseInt(aa, 10) - parseInt(bb, 10);
            });

        // genomic extent
        const [ startBP, endBP ] = keys.reduce((accumulator, key) => {
            const [ startBP, endBP, sizeKB ] = key.split('%');
            const ss = Math.min(accumulator[ 0 ], parseInt(startBP, 10));
            const ee = Math.max(accumulator[ 1 ], parseInt(  endBP, 10));
            accumulator = [ ss, ee ];
            return accumulator;
        }, [ Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY ]);

        // TODO: Erez says assume point clouds are all for chr19
        this.locus =  { chr: 'chr19', genomicStart: startBP, genomicEnd: endBP };

        this.list = [];
        this.boundingBox = new THREE.Box3();
        this.boundingSphere = new THREE.Sphere();

        let xyz = new THREE.Vector3();

        const { chr, genomicStart, genomicEnd } = this.locus;
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


            let a = (obj.startBP - genomicStart) / (genomicEnd - genomicStart);
            let b = (obj.endBP - genomicStart) / (genomicEnd - genomicStart);

            const bp = (obj.startBP + obj.endBP) / 2.0;
            const interpolant = (bp - genomicStart) / (genomicEnd - genomicStart);

            obj.geometry.userData.colorRampInterpolantWindow = { start: a, end: b, sizeBP:obj.sizeBP, interpolant, geometryUUID: obj.geometry.uuid };
            obj.geometry.userData.color = Globals.colorMapManager.retrieveRGBThreeJS(defaultColormapName, interpolant);
            obj.geometry.userData.deemphasizedColor = appleCrayonColorThreeJS('snow');

            let xyzList = [];
            let rgbList = [];

            for (let line of segment) {

                const tokens = line.split(',');
                const [ x, y, z ] = [ tokens[ 3 ], tokens[ 4 ], tokens[ 5 ] ];

                xyzList.push(parseFloat(x), parseFloat(y), parseFloat(z));

                const { r, g, b } = obj.geometry.userData.color;
                rgbList.push(r, g, b);

                xyz.set(parseFloat(x), parseFloat(y), parseFloat(z));
                this.boundingBox.expandByPoint(xyz);

            }

            obj.geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( xyzList, 3 ) );
            obj.geometry.addAttribute(    'color', new THREE.Float32BufferAttribute( rgbList, 3 ).setDynamic( true ) );
            obj.geometry.computeBoundingBox();
            obj.geometry.computeBoundingSphere();

            this.list.push(obj);

        }

        this.boundingBox.getBoundingSphere(this.boundingSphere);

        console.timeEnd(`ingest point-cloud with ${ lines.length } points`);

        Globals.eventBus.post({ type: "DidLoadPointCloudFile", data: { chr, genomicStart, genomicEnd } });

    }

    getColorRampInterpolantWindowList() {
        return this.list.map(o => o.geometry.userData.colorRampInterpolantWindow)
    }

    getBounds() {
        const { center, radius } = this.boundingSphere;
        const { min, max } = this.boundingBox;
        return { min, max, center, radius }
    };

    async loadURL ({ url, name }) {

        let string = undefined;
        try {
            string = await igv.xhr.load(url);
        } catch (e) {
            console.warn(e.message)
        }

        const { file: path } = igv.parseUri(url);
        this.ingest({ path, string });

    }

    async loadLocalFile ({ file }) {

        let string = undefined;
        try {
            string = await readFileAsText(file);
        } catch (e) {
            console.warn(e.message)
        }

        const { name: path } = file;
        this.ingest({ path, string });

    }

    reportFileLoadError(name) {
        return `PointCloudManager: Error loading ${ name }`
    }

    blurbLocus () {
        const { chr, genomicStart, genomicEnd } = this.locus;
        return `${ chr } : ${ numberFormatter(genomicStart) } - ${ numberFormatter(genomicEnd) }`;
    }

}

export const getBoundsWithPointCloud = mesh => {
    const { center, radius } = mesh.geometry.boundingSphere;
    const { min, max } = mesh.geometry.boundingBox;
    return { min, max, center, radius }
};

export default PointCloudManager;
