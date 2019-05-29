import * as THREE from "../node_modules/three/build/three.module.js";

class Gnomon extends THREE.AxesHelper {

    constructor ({ origin, xLength, yLength, zLength, color }) {

        super(1);

        // const { x: ox, y: oy, z: oz } = origin;
        // this.geometry.scale(xLength, yLength, zLength);
        // this.geometry.translate(ox, oy, oz);

        this.geometry.attributes.position = getVertexListWithSharedOriginAndLengths(origin, xLength, yLength, zLength);
        this.geometry.attributes.position.needsUpdate = true;

        this.geometry.attributes.color = getColors(color);
        this.geometry.attributes.color.needsUpdate = true;
    }
}

export default Gnomon;

const getVertexListWithSharedOriginAndLengths = (origin, xLength, yLength, zLength) => {

    const { x: ox, y: oy, z: oz } = origin;

    const vertices = [
        ox, oy, oz,	xLength + ox,           oy,           oz, // x-axis
        ox, oy, oz,	          ox, yLength + oy,           oz, // y-axis
        ox, oy, oz,	          ox,           oy, zLength + oz  // z-axis
    ];

    return new THREE.Float32BufferAttribute( vertices, 3 );
};

const getColors = (color) => {

    const { r, g, b } = color;

    const colors = [
        r, g, b,	r, g, b, // x-axis vertex colors
        r, g, b,	r, g, b, // y-axis vertex colors
        r, g, b,	r, g, b  // z-axis vertex colors
    ];

    return new THREE.Float32BufferAttribute( colors, 3 )

};
