import {globalEventBus} from "./main.js";

import { appleCrayonColorThreeJS } from "./color.js";

let hit = undefined;
let currentColor = undefined;
let highlightColor = appleCrayonColorThreeJS('tangerine');
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

            if (hit) {
                hit.material.color = currentColor;
                hit = undefined;
                currentColor = undefined;
            }

            this.isEnabled = false;

        } else if ("DidLeaveToolPalette" === event.type) {

            this.isEnabled = true;

        }

    }

    intersect({ x ,y, camera, scene }) {

        this.raycaster.setFromCamera({ x, y }, camera);

        let hitList = this.raycaster.intersectObjects(scene.children).filter((item) => { return 'groundplane' !== item.object.name });

        if (hitList.length > 0) {

            if (hit !== hitList[ 0 ].object) {

                if (hit) {
                    hit.material.color = currentColor;
                }

                hit = hitList[ 0 ].object;

                currentColor = hit.material.color;

                hit.material.color = highlightColor;

                globalEventBus.post({ type: "PickerDidHitObject", data: hit.uuid });

            }

        } else {

            if (hit) {
                hit.material.color = currentColor;
                hit = undefined;
                currentColor = undefined;
            }

        }

    }

}

export default Picker;
