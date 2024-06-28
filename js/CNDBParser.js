import {openH5File} from 'hdf5-indexed-reader'
import {FileUtils} from 'igv-utils'
import {SpacewalkGlobals} from './app.js'

class CNDBParser {

    constructor() {
    }

    async parse(path, datasource) {

        SpacewalkGlobals.url = false === FileUtils.isFilePath(path) ? path : undefined

        const config = getCNDBReaderConfiguration(path)

        const hdf5 = await openH5File(config)

        const { sample, genomeAssembly } = await datasource.initialize(hdf5)

        return { sample, genomeAssembly }

    }

}

function getCNDBReaderConfiguration(path) {

    const config = {}

    if (FileUtils.isFilePath(path)) {
        config.file = path
    } else {
        config.url = path
    }

    return config
}

export default CNDBParser
