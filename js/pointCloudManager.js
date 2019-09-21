import * as THREE from "../node_modules/three/build/three.module.js";
import { defaultColormapName } from "./colorMapManager.js";
import { appleCrayonColorThreeJS } from "./color.js";
import { globals } from "./app.js";
import Parser from "./parser.js";

class PointCloudManager {

    constructor () {
        this.path = undefined;
    }

    ingestSW({ locus, hash }) {

        this.list = [];
        this.boundingBox = new THREE.Box3();
        this.boundingSphere = new THREE.Sphere();

        let { chr, genomicStart, genomicEnd } = locus;

        let xyz = new THREE.Vector3();

        for (let [ hashKey, traces ] of Object.entries(hash)) {

            // list: [ { x, y, z }, ... ]
            for (let [ key, list ] of Object.entries(traces)) {

                let { startBP, centroidBP, endBP, sizeBP } = Parser.genomicRangeFromHashKey(key);

                let obj =
                    {
                        startBP,
                        endBP,
                        sizeBP,
                        geometry: new THREE.BufferGeometry()
                    };

                obj.colorRampInterpolantWindow =
                    {
                        start: (startBP - genomicStart) / (genomicEnd - genomicStart),
                        end: (endBP - genomicStart) / (genomicEnd - genomicStart),
                        interpolant: (centroidBP - genomicStart) / (genomicEnd - genomicStart),
                        sizeBP,
                        geometryUUID: obj.geometry.uuid
                    };

                obj.geometry.userData.color = globals.colorMapManager.retrieveRGBThreeJS(defaultColormapName, obj.colorRampInterpolantWindow.interpolant);
                obj.geometry.userData.deemphasizedColor = appleCrayonColorThreeJS('magnesium');

                let xyzList = [];
                let rgbList = [];

                for (let row of list) {

                    let { x, y, z } = row;
                    xyzList.push(parseFloat(x), parseFloat(y), parseFloat(z));

                    const { r, g, b } = obj.geometry.userData.color;
                    rgbList.push(r, g, b);

                    xyz.set(parseFloat(x), parseFloat(y), parseFloat(z));
                    this.boundingBox.expandByPoint(xyz);

                } // for (list)

                obj.geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( xyzList, 3 ) );
                obj.geometry.addAttribute(    'color', new THREE.Float32BufferAttribute( rgbList, 3 ).setDynamic( true ) );

                obj.geometry.computeBoundingBox();
                obj.geometry.computeBoundingSphere();

                this.list.push(obj);

            }

        }

        this.boundingBox.getBoundingSphere(this.boundingSphere);

    }

    getColorRampInterpolantWindowList() {
        return this.list.map(o => o.colorRampInterpolantWindow)
    }

    getBounds() {
        const { center, radius } = this.boundingSphere;
        const { min, max } = this.boundingBox;
        return { min, max, center, radius }
    };

}

export default PointCloudManager;
