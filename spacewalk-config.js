import genomes from '/src/resources/genomes.json'
import trackRegistry from '/src/resources/tracks/trackRegistry.json'
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
        urlShortener:
            {
                provider: 'tinyURL',
                apiKey: 'jBzvGNbBlrGy2znNaD0KYzk0ZLtAr71bIRvlsRhtCiu0OCTRKOd1tsMULQu2',
                domain: 't.3dg.io',
                endpoint: 'https://api.tinyurl.com/create' // Optional: defaults to TinyURL's API
            }

    }

export { spacewalkConfig }
