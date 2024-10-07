import * as THREE from "three";
import chroma from "chroma-js";
import { lerp, clamp, random } from './mathUtils.js';

function colorString2Tokens(string) {

    if (string.startsWith('rgba(')) {
        const [ignore, part ] = string.split('(')
        const [ rgba ] = part.split(')')
        return rgba.split(',').map((string, index) => index < 3 ? parseInt(string) : parseFloat(string))
    } else if (string.startsWith('rgb(')) {
        const [ignore, part ] = string.split('(')
        const [ rgb ] = part.split(')')
        return rgb.split(',').map((string) => parseInt(string))
    } else {
        return undefined
    }
}

export const rgb255String = ({r, g, b}) => {
    return `rgb(${r},${g},${b})`;
}

export const rgba255String = ({r, g, b, a}) => {
    return `rgba(${r},${g},${b},${a})`;
}

export const rgba255 = (r, g, b, a) => {
    r = clamp(r, 0, 255);
    g = clamp(g, 0, 255);
    b = clamp(b, 0, 255);
    a = clamp(a, 0.0, 1.0);
    return { r, g, b, a }
}

export const rgb255 = (r, g, b) => {
    r = clamp(r, 0, 255);
    g = clamp(g, 0, 255);
    b = clamp(b, 0, 255);
    return { r, g, b }
}

export const greyScale255 = (value) => {
    const grey = clamp(value, 0, 255);
    return { r:grey, g:grey, b: grey }
}

export const rgb255Lerp = (colorA, colorB, x) => {
    const  red = lerp(colorA.r, colorB.r, x);
    const  green = lerp(colorA.g, colorB.g, x);
    const  blue = lerp(colorA.b, colorB.b, x);
    return { r: Math.round(red), g: Math.round(green), b: Math.round(blue) }
}

export const greyScaleRandom255 = (min, max) => {
    min = clamp(min, 0, 255);
    max = clamp(max, 0, 255);
    const grey = Math.round(random(min, max));
    return { r:grey, g:grey, b: grey }
}

export const rgbRandom255 = (min, max) => {
    min = clamp(min, 0, 255);
    max = clamp(max, 0, 255);
    const r = Math.round(random(min, max));
    const g = Math.round(random(min, max));
    const b = Math.round(random(min, max));
    return { r, g, b }
}

export const rgbaRandomConstantAlpha255 = (min, max, alpha) => {
    min = clamp(min, 0, 255);
    max = clamp(max, 0, 255);
    const r = Math.round(random(min, max));
    const g = Math.round(random(min, max));
    const b = Math.round(random(min, max));
    return { r, g, b, a:alpha };
}

const rgb2hex = (r255, g255, b255) => {
    return ((r255&0x0ff)<<16)|((g255&0x0ff)<<8)|(b255&0x0ff);
}

const hex2RGB255 = (hex) => {

    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;

    hex = hex.replace(shorthandRegex, (m, r, g, b) => { return r + r + g + g + b + b; });

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {  r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : undefined;
}

const appleCrayonPaletteDictionary =
    {
        licorice: "#000000",
        lead: "#1e1e1e",
        tungsten: "#3a3a3a",
        iron: "#545453",
        steel: "#6e6e6e",
        tin: "#878687",
        nickel: "#888787",
        aluminum: "#a09fa0",
        magnesium: "#b8b8b8",
        silver: "#d0d0d0",
        mercury: "#e8e8e8",
        snow: "#ffffff",
        //
        cayenne: "#891100",
        mocha: "#894800",
        aspargus: "#888501",
        fern: "#458401",
        clover: "#028401",
        moss: "#018448",
        teal: "#008688",
        ocean: "#004a88",
        midnight: "#001888",
        eggplant: "#491a88",
        plum: "#891e88",
        maroon: "#891648",
        //
        maraschino: "#ff2101",
        tangerine: "#ff8802",
        lemon: "#fffa03",
        lime: "#83f902",
        spring: "#05f802",
        seam_foam: "#03f987",
        turquoise: "#00fdff",
        aqua: "#008cff",
        blueberry: "#002eff",
        grape: "#8931ff",
        magenta: "#ff39ff",
        strawberry: "#ff2987",
        //
        salmon: "#ff726e",
        cantaloupe: "#ffce6e",
        banana: "#fffb6d",
        honeydew: "#cefa6e",
        flora: "#68f96e",
        spindrift: "#68fbd0",
        ice: "#68fdff",
        sky: "#6acfff",
        orchid: "#6e76ff",
        lavender: "#d278ff",
        bubblegum: "#ff7aff",
        carnation: "#ff7fd3"
    };

function appleCrayonColorThreeJS (name) {
    // HEX colors are automatically converted to linear color space.
    // No need explicitly call convertSRGBToLinear()
    return new THREE.Color(appleCrayonPaletteDictionary[ name ])
}

function appleCrayonColorRGB255(name) {
    const hex = appleCrayonPaletteDictionary[ name ];
    return hex2RGB255(hex)
}

function threeJSColorToRGB255  (color) {
    const { r, g, b } = color;
    return { r: Math.floor(r*255), g: Math.floor(g*255), b: Math.floor(b*255) };
}

function rgb255ToThreeJSColor  (r, g, b) {
    return new THREE.Color(r/255, g/255, b/255).convertSRGBToLinear()
}

function blendColorsLab(colorList) {
    let L_sum = 0;
    let a_sum = 0;
    let b_sum = 0;

    // Number of colors
    const num_colors = colorList.length;

    // Sum up each component in Lab space
    colorList.forEach(color => {
        const lab = chroma(color).lab();
        L_sum += lab[0];
        a_sum += lab[1];
        b_sum += lab[2];
    });

    // Calculate averages
    const avg_L = L_sum / num_colors;
    const avg_a = a_sum / num_colors;
    const avg_b = b_sum / num_colors;

    // Form the blended Lab color
    const blended_lab = [avg_L, avg_a, avg_b];

    // Convert the blended Lab color back to RGB
    const blended_rgb = chroma.lab(blended_lab).rgb();

    // Convert RGB values to integer and return
    return blended_rgb.map(value => Math.round(value));
}

const highlightColor = appleCrayonColorThreeJS('honeydew')

// Live Map compositing method
function compositeColors(foreRGBA, backRGB) {

    const alpha = foreRGBA.a / 255;

    const r = Math.round(alpha * foreRGBA.r + (1 - alpha) * backRGB.r);
    const g = Math.round(alpha * foreRGBA.g + (1 - alpha) * backRGB.g);
    const b = Math.round(alpha * foreRGBA.b + (1 - alpha) * backRGB.b);

    return { r, g, b };
}

export { compositeColors, highlightColor, hex2RGB255, colorString2Tokens, threeJSColorToRGB255, rgb255ToThreeJSColor, appleCrayonColorThreeJS, appleCrayonColorRGB255, blendColorsLab };

