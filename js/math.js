
// interpolate between a and b. x varies from 0 to 1.
let lerp = (a, b, x) => {

    return a * (1.0 - x) + b * x;
};

// Returns a number whose value is limited to the given range
let clamp = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
};
export { lerp, clamp };
