import genomes from '/public/resources/genomes.json'
import trackRegistry from '/public/resources/tracks/trackRegistry.json'
const spacewalkConfig =
    {
        trackRegistry,
        igvConfig:
            {
                genome: 'hg19',
                locus: 'all',
                genomeList: genomes,
                showTrackLabels: false,
                showControls: false,
                showCursorTrackingGuide: true,
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
