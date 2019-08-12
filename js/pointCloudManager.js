import * as THREE from "../node_modules/three/build/three.module.js";
import Globals from './globals.js';
import { defaultColormapName } from "./colorMapManager.js";
import { appleCrayonColorThreeJS } from "./color.js";
import { readFileAsText, numberFormatter } from "./utils.js";

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

            //  key: 'startBP % endBP'
            // list: [ { startBP, endBP, x, y, z }, ... ]
            for (let [ key, list ] of Object.entries(traces)) {

                let [ startBP, endBP ] = key.split('%');

                startBP = parseInt(startBP, 10);
                  endBP = parseInt(  endBP, 10);

                const sizeBP = endBP - startBP;
                const geometry = new THREE.BufferGeometry();

                let obj =
                    {
                        geometry,
                        startBP,
                        endBP,
                        sizeBP
                    };

                let a = (startBP - genomicStart) / (genomicEnd - genomicStart);
                let b =   (endBP - genomicStart) / (genomicEnd - genomicStart);

                const bp = (startBP + endBP) / 2.0;
                const interpolant = (bp - genomicStart) / (genomicEnd - genomicStart);

                obj.geometry.userData.colorRampInterpolantWindow =
                    {
                        start: a,
                        end: b,
                        sizeBP,
                        interpolant,
                        geometryUUID: geometry.uuid
                    };

                obj.geometry.userData.color = Globals.colorMapManager.retrieveRGBThreeJS(defaultColormapName, interpolant);
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

            } // for Object.entries(traces)

        } // for Object.entries(hash)

        this.boundingBox.getBoundingSphere(this.boundingSphere);

        Globals.eventBus.post({ type: "DidLoadPointCloudFile", data: { genomeID: Globals.parser.genomeAssembly, chr, genomicStart, genomicEnd } });

    }

    getColorRampInterpolantWindowList() {
        return this.list.map(o => o.geometry.userData.colorRampInterpolantWindow)
    }

    getBounds() {
        const { center, radius } = this.boundingSphere;
        const { min, max } = this.boundingBox;
        return { min, max, center, radius }
    };

}

export default PointCloudManager;
