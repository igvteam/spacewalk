//
// node helloEnsemble.js my-ensemble-file.csv
//
const fs = require('fs');

if (3 !== process.argv.length) {
    console.error('Exactly one argument required');
    process.exit(1);
}

const input = process.argv[2];

const parts = input.split('/');
const filename = parts.pop();
const joined = parts.join('/');

const output = './cooked_' + filename;

// Read the entire file asynchronously, with a callback to replace the r's and l's
// with w's then write the result to the new file.
fs.readFile(input, 'utf-8', (error, raw) => {

    if (error) {
        throw error;
    }

    ingest(raw);

    fs.writeFile(output, raw, (error) => {
        if (error) {
            throw error;
        }
    });
});


let ensemble = {};

const ingest = (string) => {

    const a = Date.now();

    const lines = string.split(/\r?\n/);

    // discard blurb
    lines.shift();

    // discard column titles
    lines.shift();

    // chr-index ( 0-based)| segment-index (one-based) | Z | X | y

    let currentKey;
    let trace;
    for (let line of lines) {

        if ("" !== line) {

            let parts = line.split(',');

            if ('nan' === parts[ 2 ] || 'nan' === parts[ 3 ] || 'nan' === parts[ 4 ]) {
                // do nothing
            } else {

                let index = parseInt(parts[ 0 ], 10) - 1;
                let key = index.toString();

                if (undefined === currentKey || currentKey !== key) {
                    currentKey = key;
                    ensemble[ currentKey ] = { bbox: {}, array: [] };
                    trace = ensemble[ currentKey ];
                }

                // discard chr-index
                parts.shift();

                // discard segment-index
                parts.shift();

                let [ z, x, y ] = parts;
                let obj = { xyz: [ parseFloat(x), parseFloat(y), parseFloat(z) ] };
                trace.array.push(obj);
            }

        }

    }

    Object.values(ensemble).forEach(trace => {

        const [ minX, minY, minZ, maxX, maxY, maxZ ] = trace.array.map(obj => obj.xyz).reduce((accumulator, xyz) => {

            accumulator =
                [
                    // min
                    Math.min(accumulator[ 0 ], xyz[ 0 ]),
                    Math.min(accumulator[ 1 ], xyz[ 1 ]),
                    Math.min(accumulator[ 2 ], xyz[ 2 ]),

                    // max
                    Math.max(accumulator[ 3 ], xyz[ 0 ]),
                    Math.max(accumulator[ 4 ], xyz[ 1 ]),
                    Math.max(accumulator[ 5 ], xyz[ 2 ]),
                ];

            return accumulator;

        }, [ Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE ]);

        trace.bbox = { min: [ minX, minY, minZ ], max: [ maxX, maxY, maxZ ] };

    });

    const traceCount = Object.keys(ensemble).length;
    const b = Date.now() - a;
    console.log('Ensemble with ' + traceCount + ' traces. Processed in ' + b + ' milliseconds');
};

const doStuff = (text) => {
    const str = text;
    return str;
};
