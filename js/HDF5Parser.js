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

    const config = {}

    if (FileUtils.isFilePath(path)) {
        config.file = path
    } else {
        config.url = path
    }

    if('https://dl.dropboxusercontent.com/s/9bcgdsk6u4iqi0m/spleen_full.indexed.cndb?dl=0' === config.url) {
        config.indexOffset = 129268695620
    }

    return config
}

export default HDF5Parser
