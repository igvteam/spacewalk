import {ensembleManager, igvPanel} from "../app.js"
import SWBDatasource from "../datasource/SWBDatasource.js"

async function enableLiveMaps() {

    const { chr } = ensembleManager.locus
    const chromosome = igvPanel.browser.genome.getChromosome(chr.toLowerCase())

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
