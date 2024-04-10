import {openH5File} from 'hdf5-indexed-reader'
import {FileUtils} from 'igv-utils'
import {SpacewalkGlobals} from './app.js'

class SWBParser {

    constructor() {
    }

    async parse(path, datasource) {

        SpacewalkGlobals.url = false === FileUtils.isFilePath(path) ? path : undefined

        const hdf5 = await openH5File(FileUtils.isFilePath(path) ? { file:path } : { url: path })

        const { sample, genomeAssembly } = await datasource.initialize(hdf5)

        return { sample, genomeAssembly }

    }

}

export default SWBParser
