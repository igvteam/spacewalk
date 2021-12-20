import Dataset from "./dataset.js";

class NonGenomicDataset extends Dataset {

    constructor () {
        super();
        this.dictionary = {};
    }

    consume(line, regex) {

        const string = line.split(regex).shift();
        if ( isNaN(string) ) {
            this.key = string;
            this.dictionary[ this.key ] = [];
        } else {

            let [ x, y, z ] = line.split(regex);
            if (false === [ x, y, z ].some(isNaN)) {
                this.dictionary[ this.key ].push ({ x:parseFloat(x), y:parseFloat(y), z:parseFloat(z) });
            }

        }

    }

    postprocess() {
        // no-op
    }
}

export default NonGenomicDataset;
