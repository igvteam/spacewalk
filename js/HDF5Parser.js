import {openH5File} from 'hdf5-indexed-reader'
import {FileUtils} from 'igv-utils'
import {SpacewalkGlobals} from './app.js'

class HDF5Parser {

    constructor() {
    }

    async parse(path, datasource) {

        SpacewalkGlobals.url = false === FileUtils.isFilePath(path) ? path : undefined

        const config =
            {
                url: path,
                // indexURL: 'https://www.dropbox.com/s/52fyai0p99gca5f/spleen_short.index.json?dl=0'
                indexURL: 'https://www.dropbox.com/s/2z39jrqas45usoo/spleen_full.index.json?dl=0'
            }

        const hdf5 = await openH5File(config)

        await datasource.initialize(hdf5)

        return { sample: 'Dugla Bogus Sample', genomeAssembly: 'hg19' }


    }

}

export default HDF5Parser
