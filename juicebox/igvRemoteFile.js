/*
 * @author Jim Robinson Dec-2020
 */

import {igvxhr} from 'igv-utils'

class IGVRemoteFile {


    constructor(args) {
        this.config = args
        this.url = args.path || args.url
    }


    async read(position, length) {

        const range = {start: position, size: length};

        return igvxhr.loadArrayBuffer(this.url, {range});

    }
}

export default IGVRemoteFile
