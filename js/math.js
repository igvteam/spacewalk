const includes = ({ a, b, value }) => {
    return value < a || value > b ? false : true;
};

let prettyVector3String = (v3) => {

    let [ x, y, z ] = Object.values(v3).map((v) => { return fudged(v) });

    return `${ x } ${ y } ${ z }`;

};

let prettyVector3Print = (blurb, v3) => {

    let [ x, y, z ] = Object.values(v3).map((v) => { return fudged(v) });

    if (blurb) {
        console.log(blurb);
    }

    console.log(x + ' ' + y + ' ' + z);

};

let prettyMatrix4Print = (blurb, m4x4) => {

    let [ _11, _12, _13, _14, _21, _22, _23, _24, _31, _32, _33, _34, _41, _42, _43, _44 ] = m4x4.clone().transpose().elements.map((v) => { return fudged(v) });

    if (blurb) {
        console.log(blurb);
    }

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

let radians = degrees => degrees * Math.PI / 180;
let degrees = radians => radians * 180 / Math.PI;

function createBoundingBoxWithFlatXYZList(numbers) {

    const bbox =
        {
            min: [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY ],
            max: [ Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY ],
            centroid: [ 0, 0, 0 ],
        }

    for (let n = 0; n < numbers.length; n += 3) {

        const [ x, y, z ] = numbers.slice(n, n + 3)

        if ( ![ x, y, z ].some(isNaN) ) {
            // min
            bbox.min[ 0 ] = Math.min(bbox.min[ 0 ], x)
            bbox.min[ 1 ] = Math.min(bbox.min[ 1 ], y)
            bbox.min[ 2 ] = Math.min(bbox.min[ 2 ], z)

            // max
            bbox.max[ 0 ] = Math.max(bbox.max[ 0 ], x)
            bbox.max[ 1 ] = Math.max(bbox.max[ 1 ], y)
            bbox.max[ 2 ] = Math.max(bbox.max[ 2 ], z)
        }
    }

    bbox.centroid[ 0 ] = (bbox.min[ 0 ] + bbox.max[ 0 ]) / 2.0
    bbox.centroid[ 1 ] = (bbox.min[ 1 ] + bbox.max[ 1 ]) / 2.0
    bbox.centroid[ 2 ] = (bbox.min[ 2 ] + bbox.max[ 2 ]) / 2.0

    return bbox
}

function cullDuplicateXYZ(numbers) {

    const culled = []
    let previous
    for (let n = 0; n < numbers.length; n += 3) {

        const [ x, y, z ] = numbers.slice(n, n + 3)

        if (previous) {

            const [px, py, pz ] = previous

            const ix = Math.floor(x)
            const iy = Math.floor(y)
            const iz = Math.floor(z)

            if (px !== ix || py !== iy || pz !== iz) {
                culled.push(ix, iy, iz)
                previous = [ix, iy, iz]
            }
        } else {
            previous = [ Math.floor(x), Math.floor(y), Math.floor(z) ]
            culled.push(...previous)
        }

    }

    return culled
}

export {
    includes,
    radians,
    degrees,
    lerp,
    clamp,
    whichTile,
    quantize,
    random,
    prettyMatrix4Print,
    prettyVector3Print,
    prettyVector3String,
    createBoundingBoxWithFlatXYZList,
    cullDuplicateXYZ
};
