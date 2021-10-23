import { EventBus } from 'igv-widgets'
import {ballAndStick, colorRampMaterialProvider} from './app.js';

const exclusionSet = new Set([ 'gnomon', 'groundplane', 'point_cloud', 'ribbon', 'stick' ]);

class Picker {

    constructor(raycaster) {
        this.raycaster = raycaster;
        this.isEnabled = true;

        EventBus.globalBus.subscribe("DidEnterGenomicNavigator", this);
        EventBus.globalBus.subscribe("DidLeaveGenomicNavigator", this);
    }

    receiveEvent({ type, data }) {

        if ("DidEnterGenomicNavigator" === type) {
            this.isEnabled = false;
            ballAndStick.pickHighlighter.unhighlight()
        } else if ("DidLeaveGenomicNavigator" === type) {
            this.isEnabled = true;
            ballAndStick.pickHighlighter.unhighlight()
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
                    ballAndStick.pickHighlighter.processHit(hit)
                }

            } else {

                if (ballAndStick.pickHighlighter.instanceIdList) {
                    console.log(`${ Date.now() } Picker - ballHighlighter.unhighlight() then  colorRampMaterialProvider.repaint()`)
                    ballAndStick.pickHighlighter.unhighlight()
                    colorRampMaterialProvider.repaint()
                }
            }

        }
    }
}

export default Picker;
