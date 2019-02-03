

class BedTrack {

    constructor(path) {
        this.path = path
        this.features = undefined
    }

    getFeatures(chr) {
        if(!this.features) {
            loadFeatures()
        }
        return this.features[chr]
    }

    async loadFeatures() {

        this.features = {

        }

        const response = await fetch(this.path);
        const text = await response.text();
        const lines = text.split(/\r?\n/);
        for(let line of lines) {

            const tokens = line.split('\t')
            const chr = tokens[0]
            const start = Number.parseInt(tokens[1])
            const end = Number.parseInt(tokens[2])

            let featureArray = this.features[chr]
            if(!featureArray) {
                featureArray = []
                this.features[chr] = featureArray
            }

            featureArray.push({
                chr: chr,
                start: start,
                end: end
            })
        }
    }

}