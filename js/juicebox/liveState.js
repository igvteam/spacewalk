import hic from 'juicebox.js'
import {igvPanel} from "../app.js"

class LiveState extends hic.State {
   constructor(ensembleManager, contactMatrixView) {

       const binCount = ensembleManager.getLiveMapTraceLength()
       const { chr, genomicStart, genomicEnd } = ensembleManager.locus

       // bp-per-bin. Bin Size is synonymous with resolution
       const binSize = (genomicEnd - genomicStart) / binCount

       // canvas - pixel x pixel
       const { width, height } = contactMatrixView.getViewDimensions()

       // pixels-per-bin
       const pixelSize = width/binCount

       // x, y in Bin units
       const [ xBin, yBin] = [ genomicStart / binSize, genomicStart / binSize ]

       // chromosome index
       const chromosome = igvPanel.browser.genome.getChromosome(chr.toLowerCase())
       let { order } = chromosome

       super(1 + order, 1 + order, 0, xBin, yBin, width, height, pixelSize, 'NONE')
   }
}

export default LiveState
