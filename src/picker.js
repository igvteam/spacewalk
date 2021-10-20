import { EventBus } from 'igv-widgets'
import {colorRampMaterialProvider} from "./app.js";

const exclusionSet = new Set([ 'gnomon', 'groundplane', 'ribbon', 'stick' ]);

class Picker {

    constructor({ raycaster, pickerHighlighterDictionary }) {

        this.raycaster = raycaster;
        this.pickerHighlighterDictionary = pickerHighlighterDictionary;

        this.isEnabled = true;

        EventBus.globalBus.subscribe("DidEnterGenomicNavigator", this);
        EventBus.globalBus.subscribe("DidLeaveGenomicNavigator", this);
    }

    receiveEvent({ type, data }) {

        if ("DidEnterGenomicNavigator" === type) {

            this.isEnabled = false;

            for (let pickHighlighter of Object.values(this.pickerHighlighterDictionary)) {
                pickHighlighter.unhighlight()
            }

        } else if ("DidLeaveGenomicNavigator" === type) {

            this.isEnabled = true;

            for (let pickHighlighter of Object.values(this.pickerHighlighterDictionary)) {
                pickHighlighter.unhighlight()
            }


        }

    }

    intersect({ x ,y, camera, scene }) {

        if (true === this.isEnabled && x && y) {

            this.raycaster.setFromCamera({ x, y }, camera);

            const hitList = this.raycaster.intersectObjects(scene.children).filter(item => !exclusionSet.has(item.object.name) && true === item.object.visible);

            if (hitList.length > 0) {

                // Hit list contains all instances along the ray of intersection. Select the first.
                const [ hit ] = hitList;

                if (undefined !== hit.instanceId) {
                    this.pickerHighlighterDictionary.ballHighlighter.processHit(hit);
                } else if (hit.object && 'point_cloud' === hit.object.name) {
                    // TODO: Find a better approach to hitting point clouds
                    // this.pickerHighlighterDictionary[ 'pointCloud' ].processHit(hit.object);
                }


            } else {

                for (let pickHighlighter of Object.values(this.pickerHighlighterDictionary)) {

                    if (pickHighlighter.instanceIdList) {
                        console.log(`${ Date.now() } Picker - ballHighlighter.unhighlight() then  colorRampMaterialProvider.repaint()`)
                        pickHighlighter.unhighlight()
                        colorRampMaterialProvider.repaint()
                    }
                }

            }

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
