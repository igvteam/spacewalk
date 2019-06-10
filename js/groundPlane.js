import * as THREE from "../node_modules/three/build/three.module.js";
import Globals from './globals.js';
import { appleCrayonColorThreeJS } from "./color.js";
import { guiManager } from "./gui.js";

class GroundPlane extends THREE.GridHelper {

    constructor({ size, divisions, position, color, opacity, isHidden }) {

        super(size, divisions, color, color);

        this.name = 'groundplane';
        this.visible = isHidden;
        this.opacity = opacity;
        this.material.transparent = true;
        this.position.copy(position);

        Globals.eventBus.subscribe("ToggleGroundPlane", this);

    }

    receiveEvent({ type, data }) {

        if ("ToggleGroundPlane" === type) {
            this.visible = data;
        }
    }

    dispose () {
        this.geometry.dispose();
        this.material.dispose();
    }
}

export default GroundPlane;

export const groundPlaneConfigurator = (position, size) => {

    return {
        size,
        divisions: 16,
        position,
        color: appleCrayonColorThreeJS('nickel'),
        opacity: 0.125,
        isHidden: guiManager.isGroundplaneHidden($('#spacewalk_ui_manager_panel'))
    }
};
