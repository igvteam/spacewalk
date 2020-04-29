class PickHighlighter {

    constructor (highlightColor) {

        this.highlightColor = highlightColor;

        this.objects = new Set();
        this.objects.clear();

        this.instanceId = undefined;
        this.colorDictionary = {};
    }

    hasInstanceId(instanceId) {
        return this.instanceId === instanceId;
    }

    configureInstanceIdList(instanceId) {

        this.unhighlightInstance();

        this.instanceId = instanceId
        // this.colorDictionary[ instanceId ] = instanceId.material.color.clone();

        this.highlightInstance();

    }

    highlightInstance() {
        // this.instanceId.material.color.copy(this.highlightColor)
    }

    unhighlightInstance() {
        // this.instanceId.material.color.copy(this.colorDictionary[ this.instanceId ])
        this.instanceId = undefined;
        this.colorDictionary = {};
    }

    hasObject(candidate) {
        return this.objects.has(candidate);
    }

    configureObjects(objects) {

        this.unhighlight();

        for (let object of objects) {
            this.objects.add(object);
            this.colorDictionary[ object.uuid ] = object.material.color.clone();
        }


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
