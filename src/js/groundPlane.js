import * as THREE from "three";
import {appleCrayonColorThreeJS, createColorPicker, updateColorPicker } from "./utils/colorUtils.js"

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

        // Color picker UI (desktop only)
        const colorPickerContainer = document.querySelector(`div[data-colorpicker='groundplane']`);
        if (colorPickerContainer) {
            this.colorPicker = createColorPicker(colorPickerContainer, this.color, color => this.setColor(color));
        } else {
            this.colorPicker = null;
        }

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

    setVisibility(status) {
        if('visible' === status) {
            this.present();
        } else {
            this.dismiss();
        }

    }

    setState({ r, g, b, visibility}) {
        this.setVisibility(visibility);
        this.setColor(new THREE.Color(r, g, b))
        
        // Update color picker UI (desktop only)
        if (this.colorPicker) {
            const container = document.querySelector(`div[data-colorpicker='groundplane']`);
            if (container) {
                updateColorPicker(this.colorPicker, container, {r, g, b});
            }
        }
    }

    toJSON() {
        const { r, g, b } = this.color
        return { r, g, b, visibility: this.visible ? 'visible' : 'hidden' }
    }

    renderLoopHelper () {
        this.geometry.attributes.color.needsUpdate = true;
    }

    toggle() {
        this.visible = !this.visible;
        GroundPlane.setGroundPlaneWidgetVisibilityStatus(this.visible);
    }

    present() {
        this.visible = true;
        GroundPlane.setGroundPlaneWidgetVisibilityStatus(this.visible);
    }

    dismiss() {
        this.visible = false;
        GroundPlane.setGroundPlaneWidgetVisibilityStatus(this.visible);
    }

    static setGroundPlaneHidden() {
        const input = document.getElementById('spacewalk_ui_manager_groundplane');
        return !(input && input.checked);
    }

    static setGroundPlaneWidgetVisibilityStatus(status) {
        const input = document.getElementById('spacewalk_ui_manager_groundplane');
        if (input) {
            input.checked = status;
        }
    }

}

export default GroundPlane;
