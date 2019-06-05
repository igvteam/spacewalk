import * as THREE from "../node_modules/three/build/three.module.js";
import Globals from './globals.js';
import { readFileAsText } from "./utils.js";
import { appleCrayonRandomBrightColorThreeJS, rgbRandom255, rgb255ToThreeJSColor } from "./color.js";

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

        let xyzList = [];
        let rgbList = [];
        let sizeList = [];
        lines.forEach(line => {

            const tokens = line.split(',');
            xyzList.push(parseFloat(tokens[ index + 0 ]), parseFloat(tokens[ index + 1 ]), parseFloat(tokens[ index + 2 ]));

            // const { r:r255, g:g255, b:b255 } = rgbRandom255(128, 192);
            // const { r, g, b } = rgb255ToThreeJSColor(r255, g255, b255);

            const { r, g, b } = appleCrayonRandomBrightColorThreeJS();
            rgbList.push(r, g, b);

        });

        this.geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( xyzList, 3 ) );
        this.geometry.addAttribute(    'color', new THREE.Float32BufferAttribute( rgbList, 3 ) );

        this.geometry.computeBoundingBox();
        this.geometry.computeBoundingSphere();
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
