import {openH5File} from 'jsfive'
import {FileUtils, igvxhr} from 'igv-utils'
import {hideGlobalSpinner, showGlobalSpinner} from './utils.js'
import {SpacewalkGlobals} from './app.js'

class HDF5StreamingParser {

    constructor() {
    }

    async parse(path, hdf5Dataset) {

        const config =
            {
                url: path,
                indexURL: 'https://www.dropbox.com/s/52fyai0p99gca5f/spleen_short.index.json?dl=0'
            }

        const hdf5 = await openH5File(config)

        await hdf5Dataset.initialize(hdf5)

        return { sample: 'Dugla Bogus Sample', genomeAssembly: 'hg19' }


    }

    async load(path) {

        let arrayBuffer

        showGlobalSpinner()

        if (true === FileUtils.isFilePath(path)) {

            try {
                arrayBuffer = await path.arrayBuffer()
            } catch(e) {
                console.error(e.message)
            }

        } else {

            try {
                arrayBuffer = await igvxhr.loadArrayBuffer(path)
            } catch(e) {
                console.error(e.message)
            }

        }

        hideGlobalSpinner()

        SpacewalkGlobals.url = false === FileUtils.isFilePath(path) ? path : undefined

        return arrayBuffer

    }

}

export default HDF5StreamingParser
