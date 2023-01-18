import * as THREE from "three"
import Dataset from './dataset.js'
import {colorRampMaterialProvider} from "./app.js"

class GenomicDataset extends Dataset {

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
            this.dictionary[ this.key ] = {}
            this.genomicExtentList = []

        } else {

            let [ chr, startBP, endBP, x, y, z ] = line.split(regex)

            if (undefined === this.chr) {
                this.chr = chr;
            }

            startBP = parseInt(startBP, 10)
            endBP = parseInt(endBP, 10)

            const vertexDictionary = this.dictionary[ this.key ]

            const key = `${ startBP }%${ endBP }`

            if (undefined === vertexDictionary[ key ]) {
                vertexDictionary[ key ] = []
            }

            if (0 === vertexDictionary[ key ].length) {
                this.genomicExtentList.push({ startBP, endBP, centroidBP: Math.round((startBP + endBP) / 2.0), sizeBP: endBP - startBP })
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

        let [ vertexDictionary ] = Object.values(this.dictionary)
        let [ vertices ] = Object.values(vertexDictionary)

        this.locus = { chr: this.chr, genomicStart: this.genomicStart, genomicEnd: this.genomicEnd }

        this.isPointCloud = (vertices.length > 1)

        if (true === this.isPointCloud) {
            for (let vertexDictionary of Object.values(this.dictionary)) {
                for (let vertices of Object.values(vertexDictionary)) {
                    const filtered = vertices.filter(({ isMissingData }) => {
                        if (true === isMissingData) {
                            console.warn('is missing data')
                            return false
                        } else {
                            return true
                        }
                    })
                    vertices = filtered.slice()
                }
            }
        } else {

            // consolidate non-pointcloud data.
            for (let vertexDictionary of Object.values(this.dictionary)) {

                if (undefined === this.vertexCount) {
                    this.vertexCount = Object.keys(vertexDictionary).length;
                }

                for (let key of Object.keys(vertexDictionary)) {
                    const [ item ] = vertexDictionary[ key ]
                    vertexDictionary[ key ] = { x:item.x, y:item.y, z:item.z, isMissingData: item.isMissingData }
                }
            }

            for (let vertexDictionary of Object.values(this.dictionary)) {

                const bbox =
                    {
                        min: [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY ],
                        max: [ Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY ],
                        centroid: [ 0, 0, 0 ],
                    }

                for (let { x, y, z } of Object.values(vertexDictionary)) {
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

                for (let vertex of Object.values(vertexDictionary)) {
                    if (true === vertex.isMissingData) {
                        vertex.x = bbox.centroid[ 0 ]
                        vertex.y = bbox.centroid[ 1 ]
                        vertex.z = bbox.centroid[ 2 ]
                    }
                }

            }

        }

        for (let i = 0; i < this.genomicExtentList.length; i++) {
            const item = this.genomicExtentList[ i ]
            item.interpolant = (item.centroidBP - this.genomicStart) / (this.genomicEnd - this.genomicStart)
            item.start  = (item.startBP - this.genomicStart) / (this.genomicEnd - this.genomicStart)
            item.end    = (item.endBP   - this.genomicStart) / (this.genomicEnd - this.genomicStart)
        }

    }

    async getVertexListCount() {
        const list = Object.values(this.dictionary)

        return Promise.resolve(list.length)
    }

    async createTrace(i) {

        const values = Object.values(this.dictionary)

        const rows = Object.values(values[ i ])

        const trace = rows.map((row, index) => {

            const color = colorRampMaterialProvider.colorForInterpolant(this.genomicExtentList[index].interpolant)

            const xyz = true === this.isPointCloud ? row.flatMap(({x, y, z}) => [x, y, z]) : row
            const rgb = true === this.isPointCloud ? row.flatMap(ignore => [color.r, color.g, color.b]) : color
            const drawUsage = true === this.isPointCloud ? THREE.DynamicDrawUsage : THREE.StaticDrawUsage

            return {
                interpolant: this.genomicExtentList[index].interpolant,
                xyz,
                rgb,
                color,
                drawUsage
            }

        })

        return Promise.resolve(trace)
    }

    getLiveContactFrequencyMapVertexLists() {
        const values = Object.values(this.dictionary)
        return values.map(vertexDictionary => GenomicDataset.getLiveContactFrequencyMapDatasetVertices(vertexDictionary))
    }

    static getLiveContactFrequencyMapDatasetVertices(vertexDictionary) {

        return Object.values(vertexDictionary)
            .map(row => {
                const { x, y, z, isMissingData } = row
                return true === isMissingData ? { isMissingData } : { x, y, z }
            })

    }

}

export default GenomicDataset
