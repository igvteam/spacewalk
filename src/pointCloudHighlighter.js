import { pointCloud } from "./app.js";
import { setGeometryColorAttribute } from "./pointCloud.js";

class PointCloudHighlighter {

    constructor (highlightColor) {
        this.highlightColor = highlightColor
        this.objects = undefined
    }

    processHit(hit) {

        if (this.objects) {

            for (let object of this.objects) {
                if (object === hit) {
                    return;
                }
            }

            this.configureObjectList([ hit ]);

        }

    }

    hasObject(candidate) {

        if (this.objects) {

            for (let object of this.objects) {
                if (object === candidate) {
                    return true;
                }
            }

        }

        return false;
    }

    configureObjectList(objectList) {
        this.unhighlight()
        this.objects = [];
        for (let o of objectList) {
            this.objects.push(o)
        }
        this.highlight()
    }

    highlight() {
        if (undefined !== pointCloud.meshList) {
            for (let object of pointCloud.meshList) {
                setGeometryColorAttribute(object.geometry.attributes.color.array, pointCloud.deemphasizedColor)
            }
            for (let object of this.objects) {
                // setGeometryColorAttribute(object.geometry.attributes.color.array, this.highlightColor)
                setGeometryColorAttribute(object.geometry.attributes.color.array, object.geometry.userData.color)
            }
        }
    }

    unhighlight() {
        if (undefined !== pointCloud.meshList) {
            for (let object of pointCloud.meshList) {
                setGeometryColorAttribute(object.geometry.attributes.color.array, object.geometry.userData.color)
            }
        }
    }

}

export default PointCloudHighlighter
