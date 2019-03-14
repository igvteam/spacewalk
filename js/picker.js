import {globalEventBus} from "./eventBus.js";

const exclusionSet = new Set([ 'groundplane', 'stick' ]);

class Picker {

    constructor({ raycaster, pickHighlighter }) {

        this.raycaster = raycaster;
        this.pickHighlighter = pickHighlighter;
        this.isEnabled = true;

        globalEventBus.subscribe("DidEnterGUI", this);
        globalEventBus.subscribe("DidLeaveGUI", this);
    }

    receiveEvent({ type }) {

        if ("DidEnterGUI" === type) {
            this.pickHighlighter.unhighlight();
            this.isEnabled = false;
        } else if ("DidLeaveGUI" === type) {
            // console.log(Date.now() + ' picker - receive event ' + type);
            this.isEnabled = true;
        }

    }


    intersect({ x ,y, camera, scene }) {

        this.raycaster.setFromCamera({ x, y }, camera);

        let hitList = this.raycaster.intersectObjects(scene.children).filter((item) => { return !exclusionSet.has(item.object.name) });

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
