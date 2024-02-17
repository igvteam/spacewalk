import * as THREE from "three"
import DataSourceBase from './dataSourceBase.js'

class Datasource extends DataSourceBase {

    constructor() {
        super()
        this.dictionary = {}
    }

    consumeLines(lines, regex) {

        for (const line of lines) {
            this.consumeLine(line, regex)
        }

        this.postprocess()
    }

    consumeLine(line, regex) {

        if (line.startsWith('trace')) {

            this.key = line.split(regex).join('%')
            this.dictionary[ this.key ] = { genomicExtentList:[], vertexDictionary:{} }
        } else {

            const { genomicExtentList, vertexDictionary } = this.dictionary[ this.key ]

            let [ chr, startBP, endBP, x, y, z ] = line.split(regex)

            if (undefined === this.chr) {
                this.chr = chr;
            }

            startBP = parseInt(startBP, 10)
            endBP = parseInt(endBP, 10)


            const key = `${ startBP }%${ endBP }`

            if (undefined === vertexDictionary[ key ]) {
                vertexDictionary[ key ] = []
            }

            if (0 === vertexDictionary[ key ].length) {
                genomicExtentList.push({ startBP, endBP, centroidBP: Math.round((startBP + endBP) / 2.0), sizeBP: endBP - startBP })
            }

            this.genomicStart = Math.min(this.genomicStart, startBP);
            this.genomicEnd   = Math.max(this.genomicEnd,     endBP);

            if (false === [ x, y, z ].some(isNaN)) {
                vertexDictionary[ key ].push ({ x:parseFloat(x), y:parseFloat(y), z:parseFloat(z) });
            } else {
                vertexDictionary[ key ].push ({ x:'nan', y:'nan', z:'nan', isMissingData:true });
            }

        }

    }

    postprocess() {

        this.locus = { chr: this.chr, genomicStart: this.genomicStart, genomicEnd: this.genomicEnd }

        const [ anyKey ] = Object.keys(this.dictionary)
        const { vertexDictionary } = this.dictionary[ anyKey ]
        const [ vertices ] = Object.values(vertexDictionary)

        this.isPointCloud = (vertices.length > 1)

        if (true === this.isPointCloud) {

            for (const { vertexDictionary } of Object.values(this.dictionary)) {
                for (let [ key, vertices ] of Object.entries(vertexDictionary)) {

                    // discard missing data
                    const filtered = vertices.filter(({ isMissingData }) => {
                        if (true === isMissingData) {
                            console.warn('is missing data')
                            return false
                        } else {
                            return true
                        }
                    })

                    vertexDictionary[ key ] = { centroid: computeCentroid(filtered), vertices: filtered }
                }
            }

        } else {

            // consolidate non-pointcloud data.
            for (const { vertexDictionary } of Object.values(this.dictionary)) {
                for (const key of Object.keys(vertexDictionary)) {
                    const { x, y, z, isMissingData } = vertexDictionary[ key ][ 0 ]
                    vertexDictionary[ key ] = { x, y, z, isMissingData }
                }
            }

            for (const { vertexDictionary } of Object.values(this.dictionary)) {

                const bbox =
                    {
                        min: [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY ],
                        max: [ Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY ],
                        centroid: [ 0, 0, 0 ],
                    }

                for (const { x, y, z } of Object.values(vertexDictionary)) {
                    if ( ![ x, y, z ].some(isNaN) ) {
                        // min
                        bbox.min[ 0 ] = Math.min(bbox.min[ 0 ], x)
                        bbox.min[ 1 ] = Math.min(bbox.min[ 1 ], y)
                        bbox.min[ 2 ] = Math.min(bbox.min[ 2 ], z)

                        // max
                        bbox.max[ 0 ] = Math.max(bbox.max[ 0 ], x)
                        bbox.max[ 1 ] = Math.max(bbox.max[ 1 ], y)
                        bbox.max[ 2 ] = Math.max(bbox.max[ 2 ], z)
                    }
                }

                bbox.centroid[ 0 ] = (bbox.min[ 0 ] + bbox.max[ 0 ]) / 2.0
                bbox.centroid[ 1 ] = (bbox.min[ 1 ] + bbox.max[ 1 ]) / 2.0
                bbox.centroid[ 2 ] = (bbox.min[ 2 ] + bbox.max[ 2 ]) / 2.0

                for (const vertex of Object.values(vertexDictionary)) {
                    if (true === vertex.isMissingData) {
                        vertex.x = bbox.centroid[ 0 ]
                        vertex.y = bbox.centroid[ 1 ]
                        vertex.z = bbox.centroid[ 2 ]
                    }
                }
            }
        }

        // Each trace requires a genomicStart and genomicEnd
        for (const key of Object.keys(this.dictionary)) {
            const { genomicExtentList } = this.dictionary[ key ]
            this.dictionary[ key ].genomicStart = genomicExtentList[ 0 ].startBP
            this.dictionary[ key ].genomicEnd = genomicExtentList[ genomicExtentList.length - 1 ].endBP
        }

        for (const { genomicStart, genomicEnd, genomicExtentList } of Object.values(this.dictionary)) {
            const genomicExtent = genomicEnd - genomicStart
            for (const item of genomicExtentList) {
                item.interpolant = (item.centroidBP - genomicStart) / genomicExtent
                item.start  = (item.startBP - genomicStart) / genomicExtent
                item.end    = (item.endBP   - genomicStart) / genomicExtent
            }
        }

    }

    async getVertexListCount() {
        const list = Object.values(this.dictionary)
        return list.length
    }

    getGenomicExtentListWithIndex(index) {
        const { genomicExtentList } = Object.values(this.dictionary)[ index ]
        return genomicExtentList
    }

    getGenomicExtentWithIndex(index) {
        const genomicExtentList = this.getGenomicExtentListWithIndex(index)
        return { genomicStart: genomicExtentList[ 0 ].startBP, genomicEnd: genomicExtentList[ genomicExtentList.length - 1 ].endBP }
    }

    async createTrace(i) {

        const traceValues = Object.values(this.dictionary)
        const { vertexDictionary, genomicExtentList } = traceValues[ i ]
        const rows = Object.values(vertexDictionary)

        const trace = rows.map((row, index) => {

            const xyz = true === this.isPointCloud ? row.vertices.flatMap(({x, y, z}) => [x, y, z]) : row
            const drawUsage = true === this.isPointCloud ? THREE.DynamicDrawUsage : THREE.StaticDrawUsage

            const hash =
                {
                    interpolant: genomicExtentList[index].interpolant,
                    xyz,
                    drawUsage
                };

            if (true === this.isPointCloud) {
                hash.centroid = row.centroid
            }
            return hash
        })

        return Promise.resolve(trace)
    }

    getLiveContactFrequencyMapVertexLists() {
        const values = Object.values(this.dictionary)
        return values.map(traceDictionary => {
            return this.getLiveContactFrequencyMapDatasetVertices(traceDictionary)
        })
    }

    getLiveContactFrequencyMapDatasetVertices(traceDictionary) {

        return Object.values(traceDictionary)
            .map(row => {
                const { x, y, z, isMissingData } = true === this.isPointCloud ? row.centroid : row
                return true === isMissingData ? { isMissingData } : { x, y, z }
            })

    }

}

function computeCentroid(vertices) {

    const { x, y, z } = vertices.reduce((acc, current) => {
        return { x: acc.x + current.x, y: acc.y + current.y, z: acc.z + current.z }
    }, { x:0, y:0, z:0 })

    return { x: x/vertices.length, y: y/vertices.length, z: z/vertices.length }

}

export default Datasource
