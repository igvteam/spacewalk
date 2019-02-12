
import {appleCrayonColorThreeJS} from "./color.js";

let hit = undefined;
let currentColor = undefined;
let highlightColor = appleCrayonColorThreeJS('tangerine');
class Picker {

    constructor({ raycaster }) {
        this.raycaster = raycaster;
    }

    intersect({ x ,y, camera, scene }) {

        this.raycaster.setFromCamera({ x, y }, camera);

        let hitList = this.raycaster.intersectObjects(scene.children).filter((item) => { return 'groundplane' !== item.object.name });

        if (hitList.length > 0) {

            if (hit !== hitList[ 0 ].object) {

                if (hit) {

                    // TODO: post an event for consumption by subscribers to hits
                    // indicate nolonger hit

                    // hit.material.emissive.setHex(hit.currentHex);
                    hit.material.color = currentColor;
                }

                // update hit
                hit = hitList[ 0 ].object;

                // TODO: post an event for consumption by subscribers to hits

                // record default emmisive color

                // hit.currentHex = hit.material.emissive.getHex();
                currentColor = hit.material.color;

                // indicate current hit object

                // hit.material.emissive.setHex( appleCrayonColorHexValue('strawberry') );
                hit.material.color = highlightColor;
            }

        } else {

            if (hit) {

                // TODO: post an event for consumption by subscribers to hits
                // indicate nolonger hit

                // hit.material.emissive.setHex(hit.currentHex);
                hit.material.color = currentColor;
            }

            hit = undefined;
        }

    }

}

export default Picker;
