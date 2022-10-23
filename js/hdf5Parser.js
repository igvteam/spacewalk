import {FileUtils, igvxhr} from "igv-utils";
import {File as h5wasmFile, ready} from "h5wasm";

class HDF5Parser {

    constructor () {

    }

    async load (fileOrPath, traceKey) {
        let str
        let ab

        if (true === FileUtils.isFilePath(fileOrPath)) {
            str = `h5wasmHandler - retrieve path ${ fileOrPath.name }`
            console.time(str)
            ab = await fileOrPath.arrayBuffer()
        } else {
            str = `h5wasmHandler - retrieve path ${ fileOrPath }`
            console.time(str)
            ab = await igvxhr.loadArrayBuffer(fileOrPath)
        }
        console.timeEnd(str)


        str = `h5wasmHandler - Configure h5wasm`
        console.time(str)
        const { FS } = await ready

        const name = FileUtils.getFilename(fileOrPath)
        FS.writeFile(name, new Uint8Array(ab))

        const cndb = new h5wasmFile(name, 'r')
        console.timeEnd(str)





        const indices = cndb.keys()
            .map(str => parseInt(str))
            .sort((a, b) => a - b)


        const index = indices[ 0 ]
        const raw = Array.from(cndb.get(index.toString()).value)

        const trace = []
        for (let i = 0; i < raw.length; i += 3) {
            trace.push([ raw[ i ] * 165, raw[ 1 + i ] * 165, raw[ 2 + i ] * 165 ])
        }

        console.log(`trace ${ trace }`)

    }
}

export default HDF5Parser
