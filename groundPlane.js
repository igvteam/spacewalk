import * as THREE from "three";
import { appleCrayonColorThreeJS } from "./color.js";
import { doConfigureGroundplaneHidden, setGUIGroundplaneVisibility } from "./guiManager.js";

class GroundPlane extends THREE.GridHelper {

    constructor({ size, divisions, position, color, opacity, isHidden }) {

        super(size, divisions, color, color);
        this.name = 'groundplane';

        this.color = color;

        this.divisions = divisions;
        this.position.copy(position);
        this.opacity = opacity;

        this.visible = !(isHidden);
        this.material.transparent = true;

    }

    getColorState() {
        const { r, g, b } = this.color;
        return { r, g, b };
    }

    setColorState(json) {
        const { r, g, b } = json;
        this.setColor(new THREE.Color(r, g, b));
    }

    setColor(color) {

        const { r, g, b } = color;
        this.color.setRGB(r, g, b);

        let colors = this.geometry.attributes.color.array;
        let j = 0;
        for (let d = 0; d <= this.divisions; d++) {

            color.toArray( colors, j );
            j += 3;

            color.toArray( colors, j );
            j += 3;

            color.toArray( colors, j );
            j += 3;

            color.toArray( colors, j );
            j += 3;

        }

    }

    renderLoopHelper () {
        this.geometry.attributes.color.needsUpdate = true;
    }

    dispose () {
        this.geometry.dispose();
        this.material.dispose();
    }

    toggle() {
        this.visible = !this.visible;
        setGUIGroundplaneVisibility(this.visible);
    }

    present() {
        this.visible = true;
        setGUIGroundplaneVisibility(this.visible);
    }

    dismiss() {
        this.visible = false;
        setGUIGroundplaneVisibility(this.visible);
    }

    setVisibility(status) {
        if('visible' === status) {
            this.present();
        } else {
            this.dismiss();
        }

    }

}

export default GroundPlane;

export const groundPlaneConfigurator = (position, size) => {

    return {
        size,
        divisions: 16,
        position,
        color: appleCrayonColorThreeJS( 'mercury'),
        opacity: 0.25,
        isHidden: doConfigureGroundplaneHidden()
    }
};
