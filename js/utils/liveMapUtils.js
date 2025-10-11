import {ensembleManager, igvPanel} from "../main.js"
import SWBDatasource from "../datasource/SWBDatasource.js"

async function enableLiveMaps() {

    const { chr } = ensembleManager.locus

    // let chromosome = igvPanel.browser.genome.getChromosome(chr.toLowerCase())
    const chromosome = igvPanel.browser.genome.getChromosome(chr)

    if (chromosome) {
        if (ensembleManager.datasource instanceof SWBDatasource) {
            if (undefined === ensembleManager.datasource.liveContactFrequencyMapVertexLists) {
                await ensembleManager.datasource.calculateLiveMapVertexLists()
            }
            return true
        }
    }

    const str = `Live Maps can not be enabled. No valid genome for chromosome ${ chr }.`
    console.warn(str)
    alert(str)

    return false

}

export { enableLiveMaps }
