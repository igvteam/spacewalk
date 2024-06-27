import * as THREE from 'three'
import {openH5File} from 'hdf5-indexed-reader'
import {FileUtils} from 'igv-utils'
import {igvPanel, SpacewalkGlobals} from './app.js'
import DataSourceBase from './dataSourceBase.js'
import {hideGlobalSpinner, showGlobalSpinner} from "./utils";
import {createBoundingBoxWithFlatXYZList, cullDuplicateXYZ} from "./math.js"
import SpacewalkEventBus from "./spacewalkEventBus.js"

class SWBDatasource extends DataSourceBase {

    async load(path, ensembleGroupKey) {

        SpacewalkGlobals.url = false === FileUtils.isFilePath(path) ? path : undefined

        const hdf5 = await openH5File(FileUtils.isFilePath(path) ? { file:path } : { url: path })

        const { sample, genomeAssembly } = await this.initialize(hdf5, ensembleGroupKey)

        return { sample, genomeAssembly }
    }

    async initialize(hdf5, ensembleGroupKey) {

        showGlobalSpinner()

        this.hdf5 = hdf5
        const headerGroup = await hdf5.get('/Header')
        this.header = await headerGroup.attrs

        this.ensembleGroupKeys = await getEnsembleGroupKeys(hdf5)

        this.currentEnsembleGroupKey = ensembleGroupKey || this.ensembleGroupKeys[ 0 ]

        await this.updateWithEnsembleGroupKey(this.currentEnsembleGroupKey)

        hideGlobalSpinner()


        // Update the ensemble group select list with list of ensemble group keys, if more than one.
        if (this.ensembleGroupKeys.length > 1) {
            SpacewalkEventBus.globalBus.post({ type: 'DidLoadSWBEnsembleGroup', data: this.ensembleGroupKeys })
        }

        let genomeAssembly

        const hackedGenomeID = woollyMammothGenomeIDHack(this.header.genome)
        const a = undefined === hackedGenomeID
        const b = undefined === igvPanel.knownGenomes[ hackedGenomeID ]
        if (a || b) {
            console.warn(`Warning: Unrecognized genome ${ this.header.genome || 'undefined' }`)
            genomeAssembly = 'hg19'
        } else {
            genomeAssembly = hackedGenomeID
        }


        return { sample: 'Unspecified Sample', genomeAssembly }
    }

    async updateWithEnsembleGroupKey(ensembleGroupKey) {

        const genomicPositionGroup = await this.hdf5.get( `${ ensembleGroupKey }/genomic_position` )
        const dataset = await genomicPositionGroup.get('regions')
        const { chromosome, genomicExtentList } = await getGlobalGenomicExtentList(dataset)
        this.locus =
            {
                chr:chromosome,
                genomicStart:genomicExtentList[0].startBP,
                genomicEnd:genomicExtentList[genomicExtentList.length-1].endBP
            }

        console.log(`SWBDatasource - chromosome ${ this.locus.chr }`)

        this.globaleGenomicExtentList = genomicExtentList

        this.isPointCloud = ('multi_point' === this.header.point_type)
        this.vertexListCount = undefined

        SpacewalkEventBus.globalBus.post({ type: "DidSelectEnsembleGroup", data: ensembleGroupKey })
    }

    async getVertexListCount(){

        if (undefined === this.vertexListCount) {
            const group = await this.hdf5.get( `${this.currentEnsembleGroupKey}/spatial_position` )
            const list = await group.keys
            this.vertexListCount = list.length
        }

        return this.vertexListCount
    }

    async createTrace(i) {

        showGlobalSpinner()

        let str = `createTrace() - retrieve dataset: ${ this.currentEnsembleGroupKey }/spatial_position/t_${i}`
        console.time(str)
        const traceDataset = await this.hdf5.get( `${ this.currentEnsembleGroupKey }/spatial_position/t_${i}` )
        const traceValues = await traceDataset.value
        console.timeEnd(str)

        this.currentTraceIndex = i

        str = `createTrace() - build ${ true === this.isPointCloud ? 'pointcloud' : 'ball & stick' } trace`
        console.time(str)

        let trace
        if (true === this.isPointCloud) {

            const { genomicExtentList, regionXYZDictionary, regionIndexStrings } = createGenomicExtentList(traceValues, this.globaleGenomicExtentList)

            this.currentGenomicExtentList = genomicExtentList

            trace = genomicExtentList.map((genomicExtent, index) => {
                const key = regionIndexStrings[ index ]
                return createPointCloudPayload(key, genomicExtent, regionXYZDictionary[ key ])
            })
        } else {

            this.currentGenomicExtentList = this.globaleGenomicExtentList

            const xyzList = createCleanFlatXYZList(traceValues)

            trace = xyzList.map((xyz, index) => {
                const { interpolant } = this.currentGenomicExtentList[ index ]
                return { interpolant, xyz, drawUsage: THREE.StaticDrawUsage}
            })

        }
        console.timeEnd(str)

        hideGlobalSpinner()

        return trace

    }

    async calculateLiveMapVertexLists() {

        showGlobalSpinner()

        let str = `Calculate Live Contact Frequency Map VertexLists`
        console.time(str)

        const result = []


        if (true === this.isPointCloud) {
            try {

                for (let i = 0; i < this.vertexListCount; i++) {

                    console.log(`SWDatasource: Harvest ${ true === this.isPointCloud ? 'Pointcloud' : 'Ball & Stick' } vertices at index ${i}`)

                    const traceDataset = await this.hdf5.get( `${ this.currentEnsembleGroupKey }/spatial_position/t_${i}` )

                    // traceValues is a flat list of N region_id, x, y, z quadruples, one after the other
                    // in one long flat list
                    const traceValues = await traceDataset.value

                    const { genomicExtentList, regionXYZDictionary, regionIndexStrings } = createGenomicExtentList(traceValues, this.globaleGenomicExtentList)
                    const centroidList = genomicExtentList
                        .map((genomicExtent, index) => {
                            const key = regionIndexStrings[ index ]
                            return createPointCloudPayload(key, genomicExtent, regionXYZDictionary[ key ])
                        })
                        .map(({ centroid }) => { return { x:centroid[0], y:centroid[1], z:centroid[2] }})

                    const shimmed = []
                    const regionIndexStringSet = new Set(regionIndexStrings)
                    for (let i=0; i < this.globaleGenomicExtentList.length; i++) {
                        const str = `${ i }`
                        if (regionIndexStringSet.has(str)) {
                            const index = regionIndexStrings.indexOf(str)
                            shimmed.push(centroidList[ index ])
                        } else {
                            shimmed.push({ isMissingData: true })
                        }
                    }
                    result.push(shimmed)

                }

            } catch (error) {
                console.error('What the heck?', error)
            }
        } else {

            const group = await this.hdf5.get(`${ this.currentEnsembleGroupKey }`)
            const keys = await group.keys
            const keySet = new Set(keys)

            if (keySet.has('live_contact_map_vertices')) {
                const liveContactMapVertexListDataset = await this.hdf5.get( `${ this.currentEnsembleGroupKey }/live_contact_map_vertices` )
                const allTraceValues = await liveContactMapVertexListDataset.value
                const xyzList = createCleanFlatXYZList(allTraceValues)

                const howmany = this.vertexListCount
                const traceLength = this.globaleGenomicExtentList.length
                for (let i = 0, ts = 0; i < howmany; i++, ts += traceLength) {
                    const trace = xyzList.slice(ts, ts + traceLength)
                    result.push(trace)
                }
            }
        }

        console.timeEnd(str)

        hideGlobalSpinner()

        this.liveContactFrequencyMapVertexLists = result
    }

    getLiveMapVertexLists(){
        return this.liveContactFrequencyMapVertexLists
    }

    getLiveMapTraceVertices(trace) {
        return this.liveContactFrequencyMapVertexLists[ this.currentTraceIndex ]
    }

    async distanceMapPresentationHandler(distanceMapHandler) {
        if (undefined === this.liveContactFrequencyMapVertexLists) {
            await this.calculateLiveMapVertexLists()
        }
        distanceMapHandler()
    }
}

function createPointCloudPayload(key, genomicExtent, rawXYZ) {

    const { interpolant } = genomicExtent
    const xyz = cullDuplicateXYZ(rawXYZ)
    const { centroid } = createBoundingBoxWithFlatXYZList(xyz)

    console.warn(`Pointcloud: Did cull points from ${ rawXYZ.length } to ${ xyz.length }`)

    return { interpolant, xyz, centroid, drawUsage: THREE.DynamicDrawUsage }

}

function createGenomicExtentList(traceValues, globalGenomicExtentList) {

    const makeRegionXYZStack = regionXYZList => {

        const nby4 = []
        for (let i = 0; i < regionXYZList.length; i += 4) {
            let row = regionXYZList.slice(i, i + 4);
            nby4.push(row);
        }

        return nby4
    }

    // Convert flat (one-dimensional array) to two-dimensional matrix. Each row is: region-id | x | y | z
    // The result is a stack of sub-matrices each corresponding to a specific region-id
    const regionXYZStack = makeRegionXYZStack(traceValues)

    // Convert stacked sub-matrices to dictionary.
    // key: region-id
    // value: sub-matrix
    const regionXYZDictionary = convertRegionXYZStackToDictionary(regionXYZStack)
    const regionIndexStrings = Object.keys(regionXYZDictionary).sort((aString, bString) => parseInt(aString, 10) - parseInt(bString, 10))
    const genomicExtentList = []
    for (const index of regionIndexStrings) {
        genomicExtentList.push(globalGenomicExtentList[ index ])
    }

    return { genomicExtentList, regionXYZDictionary, regionIndexStrings }
}

function convertRegionXYZStackToDictionary(regionXYZStack) {
    const regionXYZDictionary = {}
    let currentSubMatrix = [];
    let currentValue = regionXYZStack[0][0];

    for (let row of regionXYZStack) {
        if (row[0] === currentValue) {
            currentSubMatrix.push(row);
        } else {
            regionXYZDictionary[currentValue.toString()] = currentSubMatrix;
            currentSubMatrix = [row];
            currentValue = row[0];
        }
    }
    // Push the last group
    regionXYZDictionary[currentValue.toString()] = currentSubMatrix;

    // discard first column
    for (let matrix of Object.values(regionXYZDictionary)) {
        matrix.map(row => row.shift())
    }

    // flatten matrices into one-dimensional array
    for (const [ key, value ] of Object.entries(regionXYZDictionary)) {
        regionXYZDictionary[key] = value.flat()
    }

    return regionXYZDictionary
}

async function getGlobalGenomicExtentList(dataset) {

    const strings = await dataset.value

    let chromosome
    const genomicExtentList = []
    for (let i = 0; i < strings.length; i += 3) {
        let [ chr, startBP, endBP ] = strings.slice(i, i + 3)
        if (undefined === chromosome) {
            chromosome = chr
        }
        startBP = Math.max(1, parseInt(startBP))
        endBP = parseInt(endBP)
        genomicExtentList.push({ startBP, endBP, centroidBP: Math.floor((endBP+startBP)/2), sizeBP: (endBP-startBP) })
    }

    const interpolantStepSize = 1/(genomicExtentList.length)
    for (let i = 0; i < genomicExtentList.length; i++) {
        genomicExtentList[ i ].start = (i * interpolantStepSize)
        genomicExtentList[ i ].interpolant = (i * interpolantStepSize) + interpolantStepSize / 2
        genomicExtentList[ i ].end = ((i + 1) * interpolantStepSize)
    }

    return { chromosome, genomicExtentList }
}

function woollyMammothGenomeIDHack(str) {
    return 'woolly mammoth' === str ? 'Loxafr3.0_HiC' : str
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

async function getEnsembleGroupKeys(hdf5) {

    let scratch = await hdf5.keys

    // discard Header key
    scratch = scratch.filter(item => 'Header' !== item)

    // if present, discard _index key
    if (new Set(scratch).has('_index')) {
        scratch.shift()
    }

    return scratch
}

export default SWBDatasource
