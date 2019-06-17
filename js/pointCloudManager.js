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

        this.list = [];
        let currentKey;
        let currentObj;
        let xyzList;
        let rgbList;

        this.boundingBox = new THREE.Box3();
        this.boundingSphere = new THREE.Sphere();
        let point = new THREE.Vector3();
        let color;
        lines.forEach((line, index) => {

            const tokens = line.split(',');
            const [ startBP, endBP, sizeKB, x, y, z ] = [ tokens[ 0 ], tokens[ 1 ], tokens[ 2 ], tokens[ 3 ], tokens[ 4 ], tokens[ 5 ] ];

            const key = startBP + '%' + endBP;

            if (undefined === currentKey || (currentKey && key !== currentKey)) {

                if (currentKey) {
                    currentObj.geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( xyzList, 3 ) );
                    currentObj.geometry.addAttribute(    'color', new THREE.Float32BufferAttribute( rgbList, 3 ) );
                    currentObj.geometry.computeBoundingBox();
                    currentObj.geometry.computeBoundingSphere();
                }

                let obj =
                    {
                        geometry: new THREE.BufferGeometry(),
                        startBP: parseFloat(startBP),
                        endBP: parseFloat(endBP),
                        sizeBP: parseFloat(sizeKB) / 1e3
                    };

                this.list.push(obj);

                currentObj = obj;

                currentKey = key;

                color = appleCrayonRandomBrightColorThreeJS();

                xyzList = [];
                rgbList = [];
            }

            xyzList.push(parseFloat(x), parseFloat(y), parseFloat(z));

            const { r, g, b } = color;
            rgbList.push(r, g, b);

            point.set(parseFloat(x), parseFloat(y), parseFloat(z));
            this.boundingBox.expandByPoint(point);

        });

        this.boundingBox.getBoundingSphere(this.boundingSphere);

        this.startBP = this.list[ 0 ].startBP;
        this.endBP = this.list[ (this.list.length - 1) ].endBP;

        console.timeEnd(`ingest point-cloud with ${ lines.length } points`);

    }

    __ingest({ path, string }){

        this.path = path;

        this.geometry = new THREE.BufferGeometry();

        const rawLines = string.split(/\r?\n/);

        // ingest keys
        const keys = rawLines.shift().split(',');


        // locate index of key for the x-coordinate of each row.
        const index = keys.indexOf('x');

        const lines = rawLines.filter(rawLine => "" !== rawLine);

        console.time(`ingest point-cloud with ${ lines.length } points`);

        let xyzList = [];
        let rgbList = [];
        let points = [];
        lines.forEach(line => {

            const tokens = line.split(',');

            const [ x, y, z ] = [ parseFloat(tokens[ index + 0 ]), parseFloat(tokens[ index + 1 ]), parseFloat(tokens[ index + 2 ]) ];

            xyzList.push(x, y, z);

            points.push(new THREE.Vector3(x, y, z));

            // const { r, g, b } = appleCrayonRandomBrightColorThreeJS();
            const { r, g, b } = appleCrayonColorThreeJS('aqua');

            rgbList.push(r, g, b);

        });

        this.geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( xyzList, 3 ) );
        this.geometry.addAttribute(    'color', new THREE.Float32BufferAttribute( rgbList, 3 ) );
        this.geometry.computeBoundingBox();
        this.geometry.computeBoundingSphere();

        // this.convexHullGeometry = new ConvexBufferGeometry(points);
        // this.convexHullGeometry.computeBoundingBox();
        // this.convexHullGeometry.computeBoundingSphere();

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
