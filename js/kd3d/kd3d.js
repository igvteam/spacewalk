
import { sortKD } from './sort.js';
import { range } from './range.js';
import { within } from './within.js';

class KDBush {

    constructor({ idList, points, getX, getY, getZ, nodeSize, ArrayType, axisCount }) {
        this.nodeSize = nodeSize;
        this.points = points;
        this.axisCount = axisCount;

        const IndexArrayType = points.length < 65536 ? Uint16Array : Uint32Array;

        this.ids = idList ? idList.slice(0) : new IndexArrayType(points.length);

        this.coords = new ArrayType(points.length * axisCount);

        for (let i = 0; i < points.length; i++) {

            if (undefined === idList) this.ids[i] = i;

            this.coords[axisCount * i + 0] = getX(points[i]);
            this.coords[axisCount * i + 1] = getY(points[i]);
            this.coords[axisCount * i + 2] = getZ(points[i]);
        }

        // kd-sort both arrays for efficient search (see comments in sort.js)
        sortKD(this.ids, this.coords, nodeSize, 0, this.ids.length - 1, 0, axisCount);

    }

    range(minX, minY, minZ, maxX, maxY, maxZ) {
        return range(this.ids, this.coords, minX, minY, minZ, maxX, maxY, maxZ, this.nodeSize, this.axisCount);
    }

    within(x, y, z, r) {
        return within(this.ids, this.coords, x, y, z, r, this.nodeSize, this.axisCount);
    }
}

export default KDBush;
