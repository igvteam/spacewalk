class Parser {
    constructor () {

    }

    parse (string) {

        let raw = string.split('\n');

        // remove comments and empty lines
        let lines = raw.filter(line => {
            return line.charAt(0) !== '#' && "" !== line;
        });

        // cell line
        const cellLine = lines.shift();

        // genome assembly
        const genomeAssembly = lines.shift();

        // genome assembly
        const [ bed, chr ] = lines.shift().split(' ');

        let hash = {};
        let hashKey = undefined;
        let trace = undefined;
        for (let line of lines) {

            // trace
            if (line.startsWith('trace')) {
                hashKey = line.split(' ').join('%');
                hash[ hashKey ] = {};
                trace = hash[ hashKey ];
            } else {

                let [ startBP, endBP, x, y, z ] = line.split(' ');

                const traceKey = `${ startBP }%${ endBP }`;

                if (undefined === trace[ traceKey ]) {
                    trace[ traceKey ] = [];
                }

                startBP = parseInt(startBP, 10);
                endBP = parseInt(endBP, 10);

                x = 'nan' === x ? undefined : parseFloat(x);
                y = 'nan' === y ? undefined : parseFloat(y);
                z = 'nan' === z ? undefined : parseFloat(z);

                trace[ traceKey ].push ({ startBP, endBP, x, y, z });
            }

        } // for (lines)

        console.log(`Parse complete ${ isPointCloud(hash) ? 'for point cloud data' : 'for ensemble data' }`)
    }
}

const isPointCloud = hash => {

    const [ key, value ] = Object.entries(hash)[ 0 ];
    return 1 === Object.keys(value).length;

};

export default Parser;
