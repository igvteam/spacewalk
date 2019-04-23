import {globalEventBus} from "./eventBus.js";

// const exclusionSet = new Set([ 'groundplane', 'stick' ]);
const exclusionSet = new Set([ 'groundplane' ]);

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


    intersect({ x ,y, camera, scene, doTrackObject }) {

        this.raycaster.setFromCamera({ x, y }, camera);

        let hitList = this.raycaster.intersectObjects(scene.children).filter((item) => { return !exclusionSet.has(item.object.name) });

        if (hitList.length > 0) {

            const [ hit ] = hitList;
            const { object } = hit;

            if (doTrackObject || false === this.pickHighlighter.hasObject(object)) {

                const { uv } = hit;
                const { x: s } = uv;

                this.pickHighlighter.configureObjects([ object ]);
                globalEventBus .post({ type: "PickerDidHitObject", data: object.uuid });
            }

        } else {
            this.pickHighlighter.unhighlight();
        }

    }

}

export default Picker;
