const spacewalkConfig = {

    genomes: "resources/genomes.json",

    trackRegistryFile: "resources/tracks/trackRegistry.json",

    igvConfig:
        {
            queryParametersSupported: true,
            genome: "hg19",
            apiKey: "AIzaSyCEmqU2lrAgKxJCbnJX87a5F3c9GejCCLA"
        },

    clientId: "661332306814-fmasnut050v7qds33tsa2rtvd5tc06sl.apps.googleusercontent.com",

    urlShortener: {
        provider: "tinyURL"
    }


}

export { spacewalkConfig }
