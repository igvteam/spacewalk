import {openH5File} from 'hdf5-indexed-reader'
import {FileUtils} from 'igv-utils'
import {SpacewalkGlobals} from './app.js'

class HDF5Parser {

    constructor() {
    }

    async parse(path, datasource) {

        SpacewalkGlobals.url = false === FileUtils.isFilePath(path) ? path : undefined

        const config = getHDF5ReaderConfiguration(path)

        const hdf5 = await openH5File(config)

        await datasource.initialize(hdf5)

        return { sample: 'Dugla Bogus Sample', genomeAssembly: 'hg19' }


    }

}

function getHDF5ReaderConfiguration(path) {
    const config =
        {
            // indexURL: 'https://www.dropbox.com/s/2z39jrqas45usoo/spleen_full.index.json?dl=0'
        };

    if (FileUtils.isFilePath(path)) {
        config.file = path
    } else {
        config.url = path
    }

    return config
}

export default HDF5Parser
