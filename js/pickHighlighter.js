import { globalEventBus } from "./eventBus.js";

class PickHighlighter {
    constructor (highlightColor) {
        this.highlightColor = highlightColor;
        this.object = this.currentColor = undefined;
    }

    hasObject() {
        return !(this.object === undefined);
    }

    isCurrentObject(candidate) {
        return this.object === candidate;
    }

    configure (object) {

        this.unhighlight();

        this.object = object;
        this.currentColor = object.material.color;

        this.highlight();
    }

    highlight() {
        this.object.material.color = this.highlightColor;
    }

    unhighlight() {

        if (this.hasObject()) {
            this.object.material.color = this.currentColor;

            globalEventBus.post({ type: "PickerDidLeaveObject", data: this.object.uuid });

            this.object = this.currentColor = undefined;

        }

    }
}

export default PickHighlighter;
