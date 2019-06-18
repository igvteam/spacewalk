import * as THREE from "../node_modules/three/build/three.module.js";
import ConvexBufferGeometry from "./threejs_es6/convexGeometry/convexGeometry.js";
import Globals from './globals.js';
import { readFileAsText } from "./utils.js";
import { appleCrayonRandomBrightColorThreeJS, appleCrayonColorThreeJS } from "./color.js";

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

        this.list = [];
        this.boundingBox = new THREE.Box3();
        this.boundingSphere = new THREE.Sphere();

        let xyz = new THREE.Vector3();

        const keys = Object.keys(segments);
        for (let key of keys) {

            const segment = segments[ key ];
            const [ startBP, endBP, sizeKB ] = key.split('%');

            let obj =
                {
                    geometry: new THREE.BufferGeometry(),
                    startBP: parseFloat(startBP),
                    endBP: parseFloat(endBP),
                    sizeBP: parseFloat(sizeKB) / 1e3
                };

            let xyzList = [];
            let rgbList = [];
            let color = appleCrayonRandomBrightColorThreeJS();

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

        this.startBP = this.list[ 0 ].startBP;
        this.endBP = this.list[ (this.list.length - 1) ].endBP;

        console.timeEnd(`ingest point-cloud with ${ lines.length } points`);

    }

    getGeometryList() {
        return this.list.map(obj => obj.geometry);
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
