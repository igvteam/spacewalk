
class PickHighlighter {
    constructor (highlightColor) {
        this.highlightColor = highlightColor;
        this.object = undefined;
    }

    configure (object) {
        this.object = object;
    }

    highlight() {
        this.currentColor = object.material.color;
        object.material.color = this.highlightColor;
    }

    unhighlight() {
        object.material.color = this.currentColor;
    }
}

export default PickHighlighter;
