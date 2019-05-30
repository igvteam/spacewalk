import * as THREE from "../node_modules/three/build/three.module.js";
import { appleCrayonColorThreeJS } from "./color.js";
import { guiManager } from "./gui.js";
import { globalEventBus } from "./eventBus.js";

class Gnomon extends THREE.AxesHelper {

    constructor ({ min, max, color, isHidden }) {

        super(1);

        this.name = 'gnomon';
        this.visible = isHidden;

        this.geometry.attributes.position = getVertexListWithSharedOriginAndLengths(min, max);
        this.geometry.attributes.position.needsUpdate = true;

        this.geometry.attributes.color = getColors(color);
        this.geometry.attributes.color.needsUpdate = true;

        globalEventBus.subscribe("ToggleGnomon", this);

    }

    receiveEvent({ type, data }) {

        if ("ToggleGnomon" === type) {
            this.visible = data;
        }
    }

    dispose () {
        this.geometry.dispose();
        this.material.dispose();
    }

}

export default Gnomon;

const getVertexListWithSharedOriginAndLengths = (min, max) => {

    const { x:ax, y:ay, z:az } = min;
    const { x:bx, y:by, z:bz } = max;

    const vertices = [
        ax, ay, az,     bx, ay, az, // x-axis
        ax, ay, az,     ax, by, az, // y-axis
        ax, ay, az,     ax, ay, bz  // z-axis
    ];

    return new THREE.Float32BufferAttribute( vertices, 3 );
};

const getColors = (color) => {

    const { r, g, b } = color;

    const colors = [
        r, g, b,        r, g, b, // x-axis vertex colors
        r, g, b,        r, g, b, // y-axis vertex colors
        r, g, b,        r, g, b  // z-axis vertex colors
    ];

    return new THREE.Float32BufferAttribute( colors, 3 )

};

export const gnomonConfigurator = (min, max) => {

    return {
        min,
        max,
        color: appleCrayonColorThreeJS('snow'),
        isHidden: guiManager.isGnomonHidden($('#spacewalk_ui_manager_panel'))
    }

};
