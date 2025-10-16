import {FileUtils, igvxhr, StringUtils} from 'igv-utils'
import FileLoad from "./fileLoad.js"
import MultipleTrackFileLoad from './multipleTrackFileLoad.js'

class GenomeFileLoad extends FileLoad {

    constructor({localFileInput, initializeDropbox, dropboxButton, loadHandler}) {
        super({localFileInput, initializeDropbox, dropboxButton})
        this.loadHandler = loadHandler
    }

    async loadPaths(paths) {

        const status = await GenomeFileLoad.isGZip(paths)

        if (true === status) {
            throw new Error('Genome did not load - gzip files are not supported')
        } else {

            let configuration = undefined

            const jsonFiles = paths.filter(path => 'json' === FileUtils.getExtension(path))
            const hubFiles = paths.filter(path => StringUtils.isString(path) && path.endsWith("/hub.txt"))
            const gbkFile = paths.filter(path => 'gbk' === FileUtils.getExtension(path))

            // If one of the paths is .json, unpack and send to loader
            // TODO -- what if multiple json files are selected?  This is surely an error
            if (jsonFiles.length > 0) {
                configuration = await igvxhr.loadJson(jsonFiles[0])
            } else if (hubFiles.length > 0) {
                configuration = {url: hubFiles[0]}
            } else if (gbkFile.length > 0) {

                configuration = {gbkURL: gbkFile[0]}
            } else if (2 === paths.length) {
                const [_0, _1] = await GenomeFileLoad.getExtension(paths)
                if ('fai' === _0) {
                    configuration = {fastaURL: paths[1], indexURL: paths[0]}
                } else if ('fai' === _1) {
                    configuration = {fastaURL: paths[0], indexURL: paths[1]}
                }
            }

            if (undefined === configuration) {
                throw new Error('Genome requires either a single JSON file, UCSC hub.txt file, genbank ".gbk" file, or a FASTA & index file')
            } else {
                this.loadHandler(configuration)
            }


        }

    }

    static async isGZip(paths) {

        for (let path of paths) {
            const filename = await MultipleTrackFileLoad.getFilename(path)
            if (true === filename.endsWith('.gz')) {
                return true
            }
        }

        return false
    }

    static async getExtension(paths) {

        const a = await MultipleTrackFileLoad.getFilename(paths[0])
        const b = await MultipleTrackFileLoad.getFilename(paths[1])

        return [a, b].map(name => FileUtils.getExtension(name))

    }


}

export default GenomeFileLoad
