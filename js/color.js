import * as THREE from "./threejs_es6/three.module.js";
import { lerp, clamp, random } from './math.js';

export let rgb255ToThreeJSColor = (r, g, b) => {

    return new THREE.Color(r/255, g/255, b/255);
};

export let rgb255String = ({r, g, b}) => {
    return `rgb(${r},${g},${b})`;
};

export let rgba255String = ({r, g, b, a}) => {
    return `rgba(${r},${g},${b},${a})`;
};

export let rgba255 = (r, g, b, a) => {

    r = clamp(r, 0, 255);
    g = clamp(g, 0, 255);
    b = clamp(b, 0, 255);
    a = clamp(a, 0.0, 1.0);

    return { r, g, b, a }
    // return "rgba(" + r + "," + g + "," + b + "," + a + ")";
};

export let rgb255 = (r, g, b) => {

    r = clamp(r, 0, 255);
    g = clamp(g, 0, 255);
    b = clamp(b, 0, 255);

    return { r, g, b }
    // return "rgb(" + r + "," + g + "," + b + ")";
};

export let greyScale255 = (value) => {

    const grey = clamp(value, 0, 255);

    return { r:grey, g:grey, b: grey }
    // return "rgb(" + grey + "," + grey + "," + grey + ")";
};

export let rgb255Lerp = (colorA, colorB, x) => {

    const  red = lerp(colorA.r, colorB.r, x);
    const  green = lerp(colorA.g, colorB.g, x);
    const  blue = lerp(colorA.b, colorB.b, x);

    return { r: Math.round(red), g: Math.round(green), b: Math.round(blue) }

};

export let randomGrey255 = (min, max) => {

    min = clamp(min, 0, 255);
    max = clamp(max, 0, 255);

    const grey = Math.round(random(min, max));

    return { r:grey, g:grey, b: grey }
    // return "rgb(" + grey + "," + grey + "," + grey + ")";
};

export let randomRGB255 = (min, max) => {

    min = clamp(min, 0, 255);
    max = clamp(max, 0, 255);

    const r = Math.round(random(min, max));
    const g = Math.round(random(min, max));
    const b = Math.round(random(min, max));

    return { r, g, b }
    // return "rgb(" + r + "," + g + "," + b + ")";
};

export let randomRGB255ConstantAlpha = (min, max, alpha) => {

    min = clamp(min, 0, 255);
    max = clamp(max, 0, 255);

    const r = Math.round(random(min, max));
    const g = Math.round(random(min, max));
    const b = Math.round(random(min, max));

    return { r, g, b, a:alpha };
    // return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
};

let rgb2hex = (r255, g255, b255) => {
    return ((r255&0x0ff)<<16)|((g255&0x0ff)<<8)|(b255&0x0ff);
};

let hex2RGB255 = (hex) => {

    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;

    hex = hex.replace(shorthandRegex, (m, r, g, b) => { return r + r + g + g + b + b; });

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {  r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : undefined;
};

let appleCrayonPaletteDictionary =
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

let appleCrayonNames = Object.keys(appleCrayonPaletteDictionary);

let appleCrayonPaletteNoGreyDictionary =
    {
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

let appleCrayonNamesNoGrey = Object.keys(appleCrayonPaletteNoGreyDictionary);

let appleCrayonColorHexValue = name => {
    let string = appleCrayonPaletteDictionary[ name ];
    let tokens = string.split('');
    tokens.shift();
    let hexString = tokens.join('');
    return parseInt(hexString, 16);
};

let appleCrayonRandomColorHexValue = () => {
    let index = Math.floor(Math.random() * Math.floor(appleCrayonNamesNoGrey.length));
    let string = appleCrayonPaletteNoGreyDictionary[ appleCrayonNamesNoGrey[ index ] ];
    let tokens = string.split('');
    tokens.shift();
    let hexString = tokens.join('');
    return parseInt(hexString, 16);
};

let appleCrayonColorThreeJS = name => {
    return new THREE.Color(appleCrayonColorHexValue(name));
};

let appleCrayonColorRGB255 = name => {

    const hex = appleCrayonPaletteDictionary[ name ];
    const rgb255 = hex2RGB255(hex);
    return rgb255;
};

export { appleCrayonNames, appleCrayonColorHexValue, appleCrayonColorThreeJS, appleCrayonRandomColorHexValue, appleCrayonColorRGB255 };

