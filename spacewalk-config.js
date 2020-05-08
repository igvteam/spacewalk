const spacewalkConfig =
    {

        genomes: "resources/genomes.json",
        trackRegistryFile: "resources/tracks/trackRegistry.json",

        // Google client id to enable loading of private Google files
        clientId: "661332306814-fmasnut050v7qds33tsa2rtvd5tc06sl.apps.googleusercontent.com",

        contactMapMenu:
            {
                id: 'contact-map-datalist',
                items: 'https://aidenlab.org/juicebox/res/hicfiles.json'
            },

        igv:
            {

                genome: 'hg19',
                showRuler: false,
                showControls: false,
                queryParametersSupported: false,

                // Google api key to enable loading of public Google files without login.
                apiKey: "AIzaSyCEmqU2lrAgKxJCbnJX87a5F3c9GejCCLA"
            },

        urlShortener:
            {
                provider: "tinyURL"
            }


    }
