import genomes from './src/resources/genomes.json'
import trackRegistry from './src/resources/tracks/trackRegistry.json'
const spacewalkConfig =
    {
        trackRegistry,
        igvConfig:
            {
                genome: 'hg19',
                locus: 'all',
                genomeList: genomes,
                showTrackLabels: true,
                showControls: false,
                showCursorGuide: true,
                queryParametersSupported: false,
                tracks: []
            },
        juiceboxConfig:
            {
                width: 480,
                height: 480,
                contactMapMenu:
                    {
                        id: 'contact-map-datalist',
                        items: 'https://aidenlab.org/juicebox/res/hicfiles.json'
                    }
            },

    }

export { spacewalkConfig }
