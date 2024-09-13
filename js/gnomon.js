import * as THREE from "three";
import { StringUtils } from 'igv-utils'
import { appleCrayonColorThreeJS, rgb255String, threeJSColorToRGB255, rgba255String } from "./utils/colorUtils.js"
import {configureColorPicker, updateColorPicker, doConfigureGnomonHidden, setGnomonVisibilityCheckboxStatus} from "./guiManager.js"

class Gnomon extends THREE.AxesHelper {

    constructor ({ min, max, boundingDiameter, color, isHidden }) {

        super(1);

        this.min = min;
        this.max = max;

        this.name = 'gnomon';

        this.color = color;

        this.geometry.attributes.position = getVertexListWithSharedOriginAndLengths(min, max);
        this.geometry.attributes.position.needsUpdate = true;

        this.geometry.attributes.color = getColors(color);
        this.geometry.attributes.color.needsUpdate = true;

        this.group = new THREE.Group();
        this.group.add( this );

        const colorString = rgb255String( threeJSColorToRGB255(color) );
        this.xAxisSprite = getXAxisSprite(min, max, boundingDiameter, colorString);
        this.group.add( this.xAxisSprite );

        this.yAxisSprite = getYAxisSprite(min, max, boundingDiameter, colorString);
        this.group.add( this.yAxisSprite );

        this.zAxisSprite = getZAxisSprite(min, max, boundingDiameter, colorString);
        this.group.add( this.zAxisSprite );

        this.group.visible = !(isHidden);

        this.colorPicker = configureColorPicker(document.querySelector(`div[data-colorpicker='gnomon']`), this.color, color => this.setColor(color));

    }

    setColor(color){

        const { r, g, b } = color;

        this.color.setRGB(r, g, b);

        let rgb = this.geometry.attributes.color;
        let colors = rgb.array;
        for (let i = 0; i < (rgb.count * rgb.itemSize); i += rgb.itemSize) {
            colors[ i     ] = r;
            colors[ i + 1 ] = g;
            colors[ i + 2 ] = b;
        }

        const colorString = rgb255String( threeJSColorToRGB255(color) );
        this.xAxisSprite.material.dispose();
        this.xAxisSprite.material = getAxisSpriteMaterial( colorString, this.max.x - this.min.x);

        this.yAxisSprite.material.dispose();
        this.yAxisSprite.material = getAxisSpriteMaterial( colorString, this.max.y - this.min.y);

        this.zAxisSprite.material.dispose();
        this.zAxisSprite.material = getAxisSpriteMaterial( colorString, this.max.z - this.min.z);

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
        updateColorPicker(this.colorPicker, document.querySelector(`div[data-colorpicker='gnomon']`), { r, g, b })
    }

    toJSON() {
        const { r, g, b } = this.color
        return { r, g, b, visibility: this.group.visible ? 'visible' : 'hidden' }
    }

    renderLoopHelper () {
        this.geometry.attributes.color.needsUpdate = true;
    }

    dispose () {
        for (let child of this.group.children) {
            child.geometry.dispose();
            child.material.dispose();
        }
    }

    addToScene (scene) {
        scene.add( this.group );
    };

    toggle() {
        this.group.visible = !this.group.visible;
        setGnomonVisibilityCheckboxStatus(this.group.visible);
    }

    present() {
        this.group.visible = true;
        setGnomonVisibilityCheckboxStatus(this.group.visible);
    }

    dismiss() {
        this.group.visible = false;
        setGnomonVisibilityCheckboxStatus(this.group.visible);
    }
}

export default Gnomon;

const getXAxisSprite = (min, max, boundingDiameter, color) => {

    const { x:ax, y:ay, z:az } = min;
    const { x:bx } = max;

    return getAxisSprite(bx, ay, az, bx - ax, boundingDiameter, color);
};

const getYAxisSprite = (min, max, boundingDiameter, color) => {

    const { x:ax, y:ay, z:az } = min;
    const { y:by } = max;

    return getAxisSprite(ax, by, az, by - ay, boundingDiameter, color);
};

const getZAxisSprite = (min, max, boundingDiameter, color) => {

    const { x:ax, y:ay, z:az } = min;
    const { z:bz } = max;

    return getAxisSprite(ax, ay, bz, bz - az, boundingDiameter, color);
};

const getAxisSprite = (x, y, z, length, boundingDiameter, color) => {

    const sprite = new THREE.Sprite( getAxisSpriteMaterial(color, length) );
    sprite.position.set(x, y, z);

    // console.log(`gnomon. scale ratio ${ 512/boundingDiameter }`);

    const scaleFactor = 0.25 * boundingDiameter;
    sprite.scale.set( scaleFactor, scaleFactor, 1 );

    return sprite;

};

const getAxisSpriteMaterial = (color, length) => {

    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');

    ctx.canvas.width = ctx.canvas.height = 1024;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.fillStyle = color;
    ctx.font = 'bold 128px sans-serif';

    length = StringUtils.numberFormatter( Math.round(length) );
    const string = `${ length }nm`;
    ctx.fillText(string, ctx.canvas.width/2, ctx.canvas.height/2);

    const material = new THREE.SpriteMaterial( { map: new THREE.CanvasTexture(ctx.canvas) } );
    material.alphaTest = 0.5;
    material.side = THREE.DoubleSide;
    material.transparent = true;

    return material;
};

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

export const gnomonConfigurator = (min, max, boundingDiameter) => {

    return {
        min,
        max,
        boundingDiameter,
        color: appleCrayonColorThreeJS('iron'),
        isHidden: doConfigureGnomonHidden()
    }

};
