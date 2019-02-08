import { appleCrayonColorHexValue } from './ei_color.js';

let hit = undefined;

class Picker {

    constructor({ raycaster }) {
        this.raycaster = raycaster;
    }

    intersect({ x ,y, camera, scene }) {

        this.raycaster.setFromCamera({ x, y }, camera);

        let hitList = this.raycaster.intersectObjects(scene.children);

        if (hitList.length > 0) {

            if (hit !== hitList[ 0 ].object) {

                if (hit) {

                    // TODO: post an event for consumption by subscribers to hits
                    // indicate nolonger hit
                    hit.material.emissive.setHex(hit.currentHex);
                }

                // update hit
                hit = hitList[ 0 ].object;


                // TODO: post an event for consumption by subscribers to hits

                // record default emmisive color
                hit.currentHex = hit.material.emissive.getHex();

                // indicate current hit object
                hit.material.emissive.setHex( appleCrayonColorHexValue('strawberry') );
            }

        } else {

            if (hit) {

                // TODO: post an event for consumption by subscribers to hits
                // indicate nolonger hit
                hit.material.emissive.setHex(hit.currentHex);
            }

            hit = undefined;
        }

    }

}

export default Picker;
