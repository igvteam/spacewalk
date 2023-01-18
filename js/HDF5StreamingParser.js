import {openH5File} from 'jsfive'
import {FileUtils} from 'igv-utils'
import {SpacewalkGlobals} from './app.js'

class HDF5StreamingParser {

    constructor() {
    }

    async parse(path, hdf5Dataset) {

        SpacewalkGlobals.url = false === FileUtils.isFilePath(path) ? path : undefined

        const config =
            {
                url: path,
                indexURL: 'https://www.dropbox.com/s/52fyai0p99gca5f/spleen_short.index.json?dl=0'
            }

        const hdf5 = await openH5File(config)

        await hdf5Dataset.initialize(hdf5)

        return { sample: 'Dugla Bogus Sample', genomeAssembly: 'hg19' }


    }

}

export default HDF5StreamingParser
