import {FileUtils, igvxhr} from "igv-utils";
import {File as h5wasmFile, ready} from "h5wasm";
import {hideGlobalSpinner, showGlobalSpinner} from "./utils";

class HDF5EnsembleManager {

    constructor () {

    }

    async load (fileOrPath, traceKey) {
        let str
        let ab


        showGlobalSpinner()

        if (true === FileUtils.isFilePath(fileOrPath)) {

            try {
                str = `h5wasmHandler - retrieve path ${ fileOrPath.name }`
                console.time(str)
                ab = await fileOrPath.arrayBuffer()
                console.timeEnd(str)
            } catch(e) {
                console.timeEnd(str)
                console.error(e.message)
            }

        } else {

            try {
                str = `h5wasmHandler - retrieve path ${ fileOrPath }`
                console.time(str)
                ab = await igvxhr.loadArrayBuffer(fileOrPath)
                console.timeEnd(str)
            } catch(e) {
                console.timeEnd(str)
                console.error(e.message)
            }

        }

        hideGlobalSpinner()


        str = `h5wasmHandler - Configure h5wasm`
        console.time(str)
        const { FS } = await ready

        const name = FileUtils.getFilename(fileOrPath)
        FS.writeFile(name, new Uint8Array(ab))

        this.ensembles = new h5wasmFile(name, 'r')
        console.timeEnd(str)





        const indices = this.ensembles.keys()
            .map(str => parseInt(str))
            .sort((a, b) => a - b)


        const index = indices[ 0 ]

        str = `h5wasmHandler - Retrieve a single trace from HDF5 file`
        console.time(str)
        const vertices = this.ensembles.get(index.toString()).value
        console.timeEnd(str)

        // const raw = Array.from(vertices)
        //
        // const trace = []
        // for (let i = 0; i < raw.length; i += 3) {
        //     trace.push([ raw[ i ] * 165, raw[ 1 + i ] * 165, raw[ 2 + i ] * 165 ])
        // }
        //
        // console.log(`trace ${ trace }`)

    }
}

export default HDF5EnsembleManager
