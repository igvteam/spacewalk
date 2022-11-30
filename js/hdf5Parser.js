import {File as h5wasmFile, ready} from 'h5wasm'
import {FileUtils, igvxhr} from 'igv-utils'
import {hideGlobalSpinner, showGlobalSpinner} from './utils.js'
import {SpacewalkGlobals} from "./app";

class HDF5Parser {

    constructor() {
    }

    async parse(path, hdf5Dataset) {

        let str

        str = 'HDF5Parser - load() complete'
        console.time(str)
        const arrayBuffer = await this.load(path)
        console.timeEnd(str)

        const { FS } = await ready

        const name = FileUtils.getFilename(path)
        FS.writeFile(name, new Uint8Array(arrayBuffer))

        const hdf5 = new h5wasmFile(name, 'r')
        hdf5Dataset.initialize(hdf5)

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

export default HDF5Parser
