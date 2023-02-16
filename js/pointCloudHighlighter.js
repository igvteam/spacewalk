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

        this.unhighlight()
        this.objects = []
        for (let o of objectList) {
            this.objects.push(o)
        }
        this.highlight()
    }

    highlight() {

        if (undefined === pointCloud.meshList) {
            return
        }

        const str = `PointCloud - Highlight`
        console.time(str)
        for (const object of pointCloud.meshList) {
            object.geometry.setAttribute('color', pointCloud.deemphasisColorAttribute)
            object.geometry.attributes.color.needsUpdate = true
        }
        for (const object of this.objects) {
            object.geometry.setAttribute('color', object.geometry.userData.colorAttribute )
            object.geometry.attributes.color.needsUpdate = true
        }
        console.timeEnd(str)
    }

    unhighlight() {

        if (undefined === pointCloud.meshList) {
            return
        }

        const str = `PointCloud - Unhighlight`
        console.time(str)
        for (let object of pointCloud.meshList) {
            object.geometry.setAttribute('color', object.geometry.userData.colorAttribute )
            object.geometry.attributes.color.needsUpdate = true
            // setGeometryColorAttribute(object.geometry.attributes.color.array, object.geometry.userData.color)
        }

        this.objects = undefined
        console.timeEnd(str)
    }

}

export default PointCloudHighlighter
