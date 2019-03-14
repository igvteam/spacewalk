let prettyMatrix4Print = ({ elements }) => {

    let [ _11, _21, _31, _41, _12, _22, _32, _42, _13, _23, _33, _43, _14, _24, _34, _44, ] = elements.map((e) => { return fudged(e) });

    console.log('...');
    console.log(_11 + ' ' + _12 + ' ' + _13 + ' ' + _14);
    console.log(_21 + ' ' + _22 + ' ' + _23 + ' ' + _24);
    console.log(_31 + ' ' + _32 + ' ' + _33 + ' ' + _34);
    console.log(_41 + ' ' + _42 + ' ' + _43 + ' ' + _44);

};

const fudge = 1e-4;
let fudged = (f) => { return Math.abs(f) < fudge ? '0.000' : f.toFixed(3).toString(); };

let quantize = (x, frequency) => {
    const tile = Math.floor(x * frequency);
    return tile / frequency;
};

let whichTile = (x, frequency) => {
    return Math.floor(x * frequency);
};

// interpolate between a and b. x varies from 0 to 1.
let lerp = (a, b, x) => {

    return a * (1.0 - x) + b * x;
};

// Returns a number whose value is limited to the given range
let clamp = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
};


// Returns a random number between min (inclusive) and max (exclusive)
let random = (min, max) => {
    return Math.random() * (max - min) + min;
};

export { lerp, clamp, whichTile, quantize, random, prettyMatrix4Print };
