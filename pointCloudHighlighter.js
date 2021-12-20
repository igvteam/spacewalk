import { pointCloud } from "./app.js";
import { setGeometryColorAttribute } from "./pointCloud.js";

class PointCloudHighlighter {

    constructor (highlightColor) {
        this.highlightColor = highlightColor
        this.objects = undefined
    }

    configureObjectList(objectList) {

        if (this.objects && this.objects.length === objectList.length) {

            const delta = objectList.filter((object, i) => object.uuid !== this.objects[ i ].uuid)
            if (0 === delta.length) {
                return
            }

        }

        console.log(`${ Date.now() } PointCloudHighlighter - configureObjectList(objectList)`)

        this.unhighlight()
        this.objects = []
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

        this.objects = undefined
    }

}

export default PointCloudHighlighter
