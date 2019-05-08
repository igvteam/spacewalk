class PickHighlighter {

    constructor (highlightColor) {
        this.highlightColor = highlightColor;

        this.objects = new Set();
        this.objects.clear();

        this.colorDictionary = {};
    }

    hasObject(candidate) {
        return this.objects.has(candidate);
    }

    configureObjects(objects) {

        this.unhighlight();

        objects.forEach((object) => {
            this.objects.add(object);
            this.colorDictionary[ object.uuid ] = object.material.color.clone();
        });

        this.highlight();
    }

    highlight() {
        this.objects.forEach(object => object.material.color.copy(this.highlightColor));
    }

    unhighlight() {

        this.objects.forEach(object => {
            object.material.color.copy(this.colorDictionary[ object.uuid ]);
        });

        this.objects.clear();
        this.colorDictionary = {};

    }
}

export default PickHighlighter;
