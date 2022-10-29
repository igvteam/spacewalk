import Dataset from './dataset.js'

class HDF5Dataset extends Dataset {

    constructor() {
        super()
    }

    initialize(hdf5) {

        const indices = hdf5.keys()
            .map(str => parseInt(str))
            .sort((a, b) => a - b)

        const index = indices[ 0 ]

        const str = 'HDF5Dataset - Retrieve single trace from HDF5 file'
        console.time(str)
        const vertices = hdf5.get(index.toString()).value
        console.timeEnd(str)

    }

}

export default HDF5Dataset
