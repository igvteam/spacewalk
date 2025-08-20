import { QuickHull } from 'quickhull3d';
import * as THREE from "three"

class ConvexHull {

    constructor(positionArray) {

        const xyzList = positionArray.reduce((acc, _, i) => {
            if (i % 3 === 0) {
                acc.push([positionArray[i], positionArray[i + 1], positionArray[i + 2]]);
            }
            return acc;
        }, []);

        const hull = new QuickHull(xyzList)

        hull.build()

        const hullFaces = hull.collectFaces()
        const hullXYZ = [];
        const hullIndices = [];
        for (const [a, b, c]  of hullFaces) {

            let index = hullXYZ.length/3
            hullIndices.push(index, ++index, ++index)

            const [ aa, bb, cc ] = [ hull.vertices[ a ].point, hull.vertices[ b ].point, hull.vertices[ c ].point ]

            hullXYZ.push(...aa, ...bb, ...cc)
        }

        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(hullXYZ, 3))
        geometry.setIndex(hullIndices)

        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true })
        this.mesh = new THREE.Mesh(geometry,  material)

    }
}

export default ConvexHull
