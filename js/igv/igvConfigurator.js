export const genomes = "resources/genomes.json";
export const trackRegistryFile = "resources/tracks/trackRegistry.json";
export const embedTarget = 'https://igv.org/web/release/2.2.0/embed.html';

export let igvBrowserConfigurator = (customTrackHandler) => {

    return {
        apiKey: "API_KEY",
            showCursorTrackingGuide: true,
        showTrackLabels: false,
        showIdeogram: false,
        // showControls: false,
        // showNavigation: false,

        "reference":
        {
            "id": "hg38",
            "name": "Human (GRCh38/hg38)",
            "fastaURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg38/hg38.fa",
            "indexURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg38/hg38.fa.fai",
            "cytobandURL": "https://s3.amazonaws.com/igv.org.genomes/hg38/annotations/cytoBandIdeo.txt.gz"
        },
        "locus":
        [
            "chr21:28000000-30000000"
        ],
            "tracks":
        [
            {
                "type": "sequence",
                "order": -1.7976931348623157e+308
            },
            {
                "url": "https://www.encodeproject.org/files/ENCFF298BFT/@@download/ENCFF298BFT.bigWig",
                "color": "#018448",
                "name": "IMR-90 RAD21 signal p-value ENCSR000EFJ",
                customTrackHandler: customTrackHandler,
                "format": "bigwig",
                "type": "wig",
                "filename": "ENCFF298BFT.bigWig",
                "sourceType": "file",
                "height": 50,
                "min": 0,
                "max": 10,
                "autoScale": false,
                "autoscale": false,
                "order": 8
            },
            {
                "url": "https://www.encodeproject.org/files/ENCFF722EUH/@@download/ENCFF722EUH.bigWig",
                "color": "#002eff",
                // "name": "IMR-90 CTCF signal p-value ENCSR000EFI",
                "name": "MrBigWig",
                customTrackHandler: customTrackHandler,
                "format": "bigwig",
                "type": "wig",
                "filename": "ENCFF722EUH.bigWig",
                "sourceType": "file",
                "height": 50,
                "min": 0,
                "max": 10,
                "autoScale": false,
                "autoscale": false,
                "order": 4
            },
            // {
            //     "url": "https://www.encodeproject.org/files/ENCFF079FWO/@@download/ENCFF079FWO.bigBed",
            //     "color": "rgb(0,0,150)",
            //     "name": "IMR-90 CTCF optimal idr thresholded peaks ENCSR000EFI",
            //     "format": "bigbed",
            //     "type": "annotation",
            //     "filename": "ENCFF079FWO.bigBed",
            //     "sourceType": "file",
            //     "maxRows": 500,
            //     "order": 7
            // },
            // {
            //     "url": "https://www.encodeproject.org/files/ENCFF087JJO/@@download/ENCFF087JJO.bigBed",
            //     "color": "rgb(0,0,150)",
            //     "name": "IMR-90 RAD21 conservative idr thresholded peaks ENCSR000EFJ",
            //     "format": "bigbed",
            //     "type": "annotation",
            //     "filename": "ENCFF087JJO.bigBed",
            //     "sourceType": "file",
            //     "maxRows": 500,
            //     "order": 9
            // },
            {
                "name": "Refseq Genes",
                "format": "refgene",
                "url": "https://s3.amazonaws.com/igv.org.genomes/hg38/refGene.sorted.txt.gz",
                "indexURL": "https://s3.amazonaws.com/igv.org.genomes/hg38/refGene.sorted.txt.gz.tbi",
                "visibilityWindow": -1,
                "removable": false,
                "order": 1000000,
                "filename": "refGene.sorted.txt.gz",
                "sourceType": "file",
                "type": "annotation",
                "maxRows": 500,
                "filterTypes":
                    [
                        "chromosome",
                        "gene"
                    ]
            }
        ]
    };

};

export const browser =
    {
        apiKey: "API_KEY",
        showCursorTrackingGuide: true,
        showTrackLabels: false,
        showIdeogram: false,
        // showControls: false,
        // showNavigation: false,

        "reference":
            {
                "id": "hg38",
                "name": "Human (GRCh38/hg38)",
                "fastaURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg38/hg38.fa",
                "indexURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg38/hg38.fa.fai",
                "cytobandURL": "https://s3.amazonaws.com/igv.org.genomes/hg38/annotations/cytoBandIdeo.txt.gz"
            },
        "locus":
            [
                "chr21:28000000-30000000"
            ],
        "tracks":
            [
                {
                    "type": "sequence",
                    "order": -1.7976931348623157e+308
                },
                {
                    "url": "https://www.encodeproject.org/files/ENCFF298BFT/@@download/ENCFF298BFT.bigWig",
                    "color": "#018448",
                    "name": "IMR-90 RAD21 signal p-value ENCSR000EFJ",
                    "format": "bigwig",
                    "type": "wig",
                    "filename": "ENCFF298BFT.bigWig",
                    "sourceType": "file",
                    "height": 50,
                    "min": 0,
                    "max": 10,
                    "autoScale": false,
                    "autoscale": false,
                    "order": 8
                },
                {
                    "url": "https://www.encodeproject.org/files/ENCFF722EUH/@@download/ENCFF722EUH.bigWig",
                    "color": "#002eff",
                    // "name": "IMR-90 CTCF signal p-value ENCSR000EFI",
                    "name": "MrBigWig",
                    "format": "bigwig",
                    "type": "wig",
                    "filename": "ENCFF722EUH.bigWig",
                    "sourceType": "file",
                    "height": 50,
                    "min": 0,
                    "max": 10,
                    "autoScale": false,
                    "autoscale": false,
                    "order": 4
                },
                // {
                //     "url": "https://www.encodeproject.org/files/ENCFF079FWO/@@download/ENCFF079FWO.bigBed",
                //     "color": "rgb(0,0,150)",
                //     "name": "IMR-90 CTCF optimal idr thresholded peaks ENCSR000EFI",
                //     "format": "bigbed",
                //     "type": "annotation",
                //     "filename": "ENCFF079FWO.bigBed",
                //     "sourceType": "file",
                //     "maxRows": 500,
                //     "order": 7
                // },
                // {
                //     "url": "https://www.encodeproject.org/files/ENCFF087JJO/@@download/ENCFF087JJO.bigBed",
                //     "color": "rgb(0,0,150)",
                //     "name": "IMR-90 RAD21 conservative idr thresholded peaks ENCSR000EFJ",
                //     "format": "bigbed",
                //     "type": "annotation",
                //     "filename": "ENCFF087JJO.bigBed",
                //     "sourceType": "file",
                //     "maxRows": 500,
                //     "order": 9
                // },
                {
                    "name": "Refseq Genes",
                    "format": "refgene",
                    "url": "https://s3.amazonaws.com/igv.org.genomes/hg38/refGene.sorted.txt.gz",
                    "indexURL": "https://s3.amazonaws.com/igv.org.genomes/hg38/refGene.sorted.txt.gz.tbi",
                    "visibilityWindow": -1,
                    "removable": false,
                    "order": 1000000,
                    "filename": "refGene.sorted.txt.gz",
                    "sourceType": "file",
                    "type": "annotation",
                    "maxRows": 500,
                    "filterTypes":
                        [
                            "chromosome",
                            "gene"
                        ]
                }
            ]
    };

export const clientId = "CLIENT_ID";

export const urlShortener =
    {
        provider: "bitly",
        apiKey: "BITLY_TOKEN"
    };


