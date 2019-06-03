import * as THREE from "../node_modules/three/build/three.module.js";
import { guiManager } from "./gui.js";
import { globalEventBus } from "./eventBus.js";
import { appleCrayonColorThreeJS, appleCrayonColorRGB255, rgb255String } from "./color.js";
import { numberFormatter } from "./utils.js";

class Gnomon extends THREE.AxesHelper {

    constructor ({ min, max, color, isHidden }) {

        super(1);

        this.name = 'gnomon';

        this.geometry.attributes.position = getVertexListWithSharedOriginAndLengths(min, max);
        this.geometry.attributes.position.needsUpdate = true;

        this.geometry.attributes.color = getColors(color);
        this.geometry.attributes.color.needsUpdate = true;

        this.group = new THREE.Group();
        this.group.add( this );

        this.group.add( getXAxisSprite(min, max) );
        this.group.add( getYAxisSprite(min, max) );
        this.group.add( getZAxisSprite(min, max) );

        this.group.visible = isHidden;


        globalEventBus.subscribe("ToggleGnomon", this);

    }

    receiveEvent({ type, data }) {

        if ("ToggleGnomon" === type) {
            this.group.visible = data;
        }
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

}

export default Gnomon;

const getXAxisSprite = (min, max) => {

    const { x:ax, y:ay, z:az } = min;
    const { x:bx, y:by, z:bz } = max;

    const length = bx - ax;
    return getAxisSprite(bx, ay, az, length);
};

const getYAxisSprite = (min, max) => {

    const { x:ax, y:ay, z:az } = min;
    const { x:bx, y:by, z:bz } = max;

    const length = by - ay;
    return getAxisSprite(ax, by, az, length.toString());
};

const getZAxisSprite = (min, max) => {

    const { x:ax, y:ay, z:az } = min;
    const { x:bx, y:by, z:bz } = max;

    const length = bz - az;
    return getAxisSprite(ax, ay, bz, length.toString());
};

const getAxisSprite = (x, y, z, length) => {

    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');

    ctx.canvas.width = ctx.canvas.height = 1024;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.fillStyle = rgb255String( appleCrayonColorRGB255('snow') );
    ctx.font = 'bold 128px sans-serif';

    length = numberFormatter( Math.round(length) );
    const string = length + 'nm';
    ctx.fillText(string, ctx.canvas.width/2, ctx.canvas.height/2);

    const material = new THREE.SpriteMaterial( { map: new THREE.CanvasTexture(ctx.canvas) } );
    material.alphaTest = 0.5;
    material.side = THREE.DoubleSide;
    material.transparent = true;

    const sprite = new THREE.Sprite( material );
    sprite.position.set(x, y, z);
    sprite.scale.set( 512, 512, 1 );

    return sprite;

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

export const gnomonConfigurator = (min, max) => {

    return {
        min,
        max,
        color: appleCrayonColorThreeJS('snow'),
        isHidden: guiManager.isGnomonHidden($('#spacewalk_ui_manager_panel'))
    }

};
