
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

export { lerp, clamp, whichTile, quantize, random };
