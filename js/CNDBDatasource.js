import * as THREE from 'three'
import DataSourceBase from './dataSourceBase.js'
import SpacewalkEventBus from './spacewalkEventBus.js'
import {hideGlobalSpinner, showGlobalSpinner} from "./utils";
import {createBoundingBoxWithFlatXYZList} from "./math.js"
import {StringUtils} from "igv-utils"
import igv from 'igv'

class CNDBDatasource extends DataSourceBase {

    constructor() {
        super()
        this.currentXYZList = undefined
    }

    async initialize(hdf5) {

        showGlobalSpinner()

        this.hdf5 = hdf5
        const headerGroup = await hdf5.get('/Header')
        this.header = await headerGroup.attrs

        this.replicaKeys = await getReplicaKeys(hdf5)

        this.isPointCloud = await isPointCloud(hdf5, this.replicaKeys)

        await this.updateWithReplicaKey(this.replicaKeys[ 0 ])

        hideGlobalSpinner()

        // Update the CNDB select list with list of replica keys, if more than one.
        if (this.replicaKeys.length > 1) {
            SpacewalkEventBus.globalBus.post({ type: 'DidLoadCNDBFile', data: this.replicaKeys })
        }

        let genomeAssembly
        if (undefined === this.header.genome || undefined === igv.GenomeUtils.KNOWN_GENOMES[ this.header.genome ]) {
            console.warn(`Warning: Unrecognized genome ${ this.header.genome || 'undefined' }`)
            genomeAssembly = 'hg19'
        } else {
            genomeAssembly = this.header.genome
        }
        return { sample: this.header.genome, genomeAssembly }
    }

    async updateWithReplicaKey(replicaKey) {

        this.currentReplicaKey = replicaKey

        this.vertexListCount = undefined

        let genomicStart
        let genomicEnd
        let genomicPositions
        const traceGroup = await this.hdf5.get( this.currentReplicaKey )

        if (true === this.isPointCloud) {
            [ genomicStart, genomicEnd ] = await deriveLocusFromGenomicExtentLists(traceGroup)
        } else {
            const genomicPositionDataset = await traceGroup.get('genomic_position')
            genomicPositions = await genomicPositionDataset.value
            genomicStart = parseInt(genomicPositions[ 0 ])
            genomicEnd = parseInt(genomicPositions[ genomicPositions.length - 1 ])
        }

        if (undefined === this.header.chromosome) {
            console.warn(`CNDBDatasource - no chromosome defined in header`)
        }

        const extractCHRSubstring = input => {
            const re = /CHR_\d+/g
            let list = input.match(re)

            // handle leading 0 for digits less than 10
            list = list.map(match => match.replace(/^CHR_0+(\d+)/, 'CHR_$1'))

            const [ str, number ] = list[0].split('_')
            const chr = `${str.toLowerCase()}${number}`
            return chr
        }

        // const chr = this.header.chromosome || 'all'
        const chr = extractCHRSubstring(replicaKey)
        console.log(`CNDBDatasource - chromosome ${ chr }`)

        this.locus = { chr, genomicStart, genomicEnd }

    }

    async getVertexListCount(){

        if (undefined === this.vertexListCount) {
            const group = await this.hdf5.get( `${ this.currentReplicaKey }/spatial_position` )
            const list = await group.keys
            this.vertexListCount = list.length
        }

        return this.vertexListCount
    }

    async createTrace(i) {

        const str = `CNDB Datasource - createTrace(${i})`
        console.time(str)

        showGlobalSpinner()

        let trace
        if (true === this.isPointCloud) {
            const traceGroup = await this.hdf5.get( this.currentReplicaKey )
            const genomicPositionDataset = await traceGroup.get(`genomic_position/${1+i}`)

            // raw list of start&end strings that encode start/end bp values
            const startEndEncodingList = await genomicPositionDataset.value

            const bpList = startEndEncodingList.map(item => item.split('&').map(str => parseInt(str))).flat()
            const minBP = Math.min(...bpList)
            const maxBP = Math.max(...bpList)

            this.currentGenomicExtentList = startEndEncodingList.map((item) => {
                const [ startBP, endBP ] = item.split('&').map(string => parseInt(string))
                const centroidBP = (endBP+startBP)/2
                const sizeBP = endBP - startBP
                return {
                    startBP,
                    endBP,
                    centroidBP,
                    sizeBP,
                    start: (startBP - minBP)/(maxBP - minBP),
                    interpolant: (centroidBP - minBP)/(maxBP - minBP),
                    end: (endBP - minBP)/(maxBP - minBP)
                }
            })

            const spatialPositionGroup = await traceGroup.get(`spatial_position/${1+i}`)

            trace = []
            for (let i = 0; i < startEndEncodingList.length; i++) {

                const key = startEndEncodingList[ i ]

                const xyzDataset = await spatialPositionGroup.get(`${ key }`)

                const xyz = await xyzDataset.value
                const { centroid } = createBoundingBoxWithFlatXYZList(xyz)

                const hash =
                    {
                        interpolant: this.currentGenomicExtentList[ i ].interpolant,
                        xyz,
                        centroid,
                        drawUsage: THREE.DynamicDrawUsage
                    };

                trace.push(hash)
            }

        } else {
            const xyzDataset = await this.hdf5.get( `${ this.currentReplicaKey }/spatial_position/${ 1 + i }` )
            const numbers = await xyzDataset.value

            const bpDataset = await this.hdf5.get(`${ this.currentReplicaKey }/genomic_position`)
            this.currentGenomicExtentList = await getGenomicExtentList(bpDataset)

            this.currentXYZList = createCleanFlatXYZList(numbers)

            trace = []
            let j = 0
            for (const xyz of this.currentXYZList) {

                const object =
                    {
                        interpolant: this.currentGenomicExtentList[ j ].interpolant,
                        xyz,
                        drawUsage: THREE.StaticDrawUsage
                    }

                trace.push(object)

                ++j
            }

        }

        hideGlobalSpinner()
        console.timeEnd(str)

        return trace

    }

    getLiveContactFrequencyMapVertexLists() {

        if (this.isPointCloud) {
            return undefined
        } else {
            return this.currentXYZList
        }

    }

}

async function deriveLocusFromGenomicExtentLists(traceGroup) {

    const group = await traceGroup.get(`genomic_position`)
    const keys = await group.keys

    const all = []
    for (const key of keys) {
        const dataset = await traceGroup.get(`genomic_position/${ key }`)
        const list = await dataset.value
        const unique = new Set( list.map(item => item.split('&').map(str => parseInt(str))).flat() )
        all.push( [ ...unique ] )
    }

    const flat = all.flat()
    const min = Math.min(...flat)
    const max = Math.max(...flat)
    return [ min, max ]
}

async function getGenomicExtentList(dataset) {

    const bigIntegers = await dataset.value
    const integers = bigIntegers.map(bigInt64 => parseInt(bigInt64))

    const genomicExtentList = []
    for (let i = 0; i < integers.length; i += 2) {

        const [ startBP, endBP ] = [ integers[ i ], integers[ 1 + i ] ]

        // lazy assignment to sizeBP
        let sizeBP
        if (undefined === sizeBP) {
            sizeBP = endBP - startBP
        }

        genomicExtentList.push({ startBP, endBP, centroidBP: Math.floor((endBP+startBP)/2), sizeBP: (endBP-startBP) })
    }

    const interpolantStepSize = 1/(genomicExtentList.length)
    for (let i = 0; i < genomicExtentList.length; i++) {
        genomicExtentList[ i ].start = (i * interpolantStepSize)
        genomicExtentList[ i ].interpolant = (i * interpolantStepSize) + interpolantStepSize / 2
        genomicExtentList[ i ].end = ((i + 1) * interpolantStepSize)
    }

    return genomicExtentList
}

function createCleanFlatXYZList(numbers) {

    const bbox = createBoundingBoxWithFlatXYZList(numbers)
    const isMissingData = { x: bbox.centroid[ 0 ], y: bbox.centroid[ 1 ], z: bbox.centroid[ 2 ], isMissingData: true }

    const list = []
    for (let v = 0; v < numbers.length; v += 3) {

        const [ x, y, z ] = numbers.slice(v, v + 3)

        if ( [ x, y, z ].some(isNaN) ) {
            // console.warn('is missing xyz value. will replace with centroid')
            list.push(isMissingData)
        } else {
            list.push({ x, y, z, isMissingData: undefined })
        }

    }

    return list
}

async function isPointCloud(hdf5, replicaKeys) {

    const replicaKey = replicaKeys[ 0 ]
    const group = await hdf5.get( replicaKey )
    const genomicPositionDataset = await group.get('genomic_position')

    const probe = await genomicPositionDataset.value

    return (undefined === probe)

    // if (undefined === probe) {
    //     console.log('pointcloud')
    //     const dataset = await group.get(`genomic_position/1`)
    //     const listOfGenomicStartEnds = await dataset.value
    //     this.isPointCloud = true
    // } else {
    //     console.log('ball & stick')
    // }

}

async function getReplicaKeys(hdf5) {

    let scratch = await hdf5.keys

    // discard Header key
    scratch = scratch.filter(item => 'Header' !== item)

    // if present, discard _index key
    if (new Set(scratch).has('_index')) {
        scratch.shift()
    }

    return scratch
}

export default CNDBDatasource
