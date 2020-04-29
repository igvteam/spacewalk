import { eventBus } from "./app.js";

const exclusionSet = new Set([ 'gnomon', 'groundplane', 'point_cloud_convex_hull', 'point_cloud', 'ribbon', 'noodle', 'stick' ]);

class Picker {

    constructor({ raycaster, pickHighlighter }) {

        this.raycaster = raycaster;
        this.pickHighlighter = pickHighlighter;
        this.isEnabled = true;

        eventBus.subscribe("DidEnterGUI", this);
        eventBus.subscribe("DidLeaveGUI", this);
    }

    receiveEvent({ type }) {

        if ("DidEnterGUI" === type) {
            this.pickHighlighter.unhighlightInstance();
            this.isEnabled = false;
        } else if ("DidLeaveGUI" === type) {
            this.isEnabled = true;
        }

    }

    intersect({ x ,y, camera, scene, doTrackObject }) {

        this.raycaster.setFromCamera({ x, y }, camera);

        let hitList = this.raycaster.intersectObjects(scene.children).filter((item) => {
            return !exclusionSet.has(item.object.name) && true === item.object.visible;
        });

        if (hitList.length > 0) {

            const [ hit ] = hitList;

            if (undefined !== hit.instanceId) {

                console.log(`${ Date.now() }. Picker.intersect instance ID ${ hit.instanceId }.`)

                if (doTrackObject || false === this.pickHighlighter.hasInstanceId(hit.instanceId)) {
                    this.pickHighlighter.configureInstanceIdList(hit.instanceId);
                    eventBus.post({ type: "PickerDidHitObject", data: hit.instanceId });
                }

            }

        } else {
            this.pickHighlighter.unhighlightInstance();
            eventBus.post({ type: "PickerDidLeaveObject" });
        }

    }

}

export default Picker;
