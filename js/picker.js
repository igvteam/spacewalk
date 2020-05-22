import { eventBus } from "./app.js";
import ColorRampPanel from "./colorRampPanel.js";

const exclusionSet = new Set([ 'gnomon', 'groundplane', 'point_cloud_convex_hull', 'point_cloud', 'ribbon', 'noodle', 'stick' ]);

class Picker {

    constructor({ raycaster, pickerHighlighterDictionary }) {

        this.raycaster = raycaster;
        this.pickerHighlighterDictionary = pickerHighlighterDictionary;
        this.isEnabled = true;

        eventBus.subscribe("DidEnterGUI", this);
        eventBus.subscribe("DidLeaveGUI", this);
    }

    receiveEvent({ type, data }) {

        if ("DidEnterGUI" === type) {

            for (let pickHighlighter of Object.values(this.pickerHighlighterDictionary)) {
                pickHighlighter.unhighlight();
            }

            this.isEnabled = false;

        } else if ("DidLeaveGUI" === type) {
            if (data instanceof ColorRampPanel) {

                for (let pickHighlighter of Object.values(this.pickerHighlighterDictionary)) {
                    pickHighlighter.unhighlight();
                }
            }
            this.isEnabled = true;
        }

    }

    intersect({ x ,y, camera, scene }) {

        this.raycaster.setFromCamera({ x, y }, camera);

        const hitList = this.raycaster.intersectObjects(scene.children).filter(item => !exclusionSet.has(item.object.name) && true === item.object.visible);

        if (hitList.length > 0) {

            // Hit list contains all instances along the ray of intersection. Select the first.
            const [ hit ] = hitList;

            if (undefined !== hit.instanceId) {
                this.pickerHighlighterDictionary[ 'ball' ].processHit(hit);
            }

        } else {

            for (let pickHighlighter of Object.values(this.pickerHighlighterDictionary)) {
                pickHighlighter.unhighlight();
            }

            eventBus.post({ type: "PickerDidLeaveObject" });
        }

    }

    POINTLIST_VERSION_intersect({ x ,y, camera, scene }) {

        this.raycaster.setFromCamera({ x, y }, camera);

        const pointCloudHitList = this.raycaster.intersectObjects(scene.children).filter(item => 'point_cloud' === item.object.name);

        if (pointCloudHitList.length > 0) {
            console.log('the hits just keep on coming');
        }

    }

}

export default Picker;
