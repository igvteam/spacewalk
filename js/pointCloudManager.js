import * as THREE from "../node_modules/three/build/three.module.js";
import ConvexBufferGeometry from "./threejs_es6/convexGeometry/convexGeometry.js";
import Globals from './globals.js';
import { readFileAsText } from "./utils.js";
import { appleCrayonRandomBrightColorThreeJS, appleCrayonColorThreeJS } from "./color.js";

class PointCloudManager {

    constructor () {
        this.path = undefined;
    }

    ingest({ path, string }){

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

        this.convexHullGeometry = new ConvexBufferGeometry(points);
        this.convexHullGeometry.computeBoundingBox();
        this.convexHullGeometry.computeBoundingSphere();

        console.timeEnd(`ingest point-cloud with ${ lines.length } points`);

    }

    async loadURL ({ url, name }) {

        try {

            let urlContents = await igv.xhr.load(url);
            const { file } = igv.parseUri(url);

            Globals.eventBus.post({ type: "DidLoadPointCloudFile", data: { name: file, payload: urlContents } });

        } catch (error) {
            console.warn(error.message);
        }

    }

    async loadLocalFile ({ file }) {

        try {
            const fileContents = await readFileAsText(file);
            Globals.eventBus.post({ type: "DidLoadPointCloudFile", data: { name: file.name, payload: fileContents } });
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
