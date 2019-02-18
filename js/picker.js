import {globalEventBus} from "./main.js";

class Picker {

    constructor({ raycaster, pickHighlighter }) {

        this.raycaster = raycaster;
        this.pickHighlighter = pickHighlighter;
        this.isEnabled = true;

        globalEventBus.subscribe("DidEnterToolPalette", this);
        globalEventBus.subscribe("DidLeaveToolPalette", this);
    }

    receiveEvent(event) {

        if ("DidEnterToolPalette" === event.type) {
            this.pickHighlighter.unhighlight();
            this.isEnabled = false;
        } else if ("DidLeaveToolPalette" === event.type) {
            this.isEnabled = true;
        }

    }

    intersect({ x ,y, camera, scene }) {

        this.raycaster.setFromCamera({ x, y }, camera);

        let hitList = this.raycaster.intersectObjects(scene.children).filter((item) => { return 'groundplane' !== item.object.name });

        if (hitList.length > 0) {

            if (false === this.pickHighlighter.isCurrentObject(hitList[ 0 ].object)) {
                this.pickHighlighter.configure(hitList[ 0 ].object);
                globalEventBus.post({ type: "PickerDidHitObject", data: this.pickHighlighter.object.uuid });
            }

        } else {
            this.pickHighlighter.unhighlight();
        }

    }

}

export default Picker;
