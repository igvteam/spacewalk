import { pointCloud } from "./app.js";

class PointCloudHighlighter {

    constructor () {
        this.objects = undefined
    }

    highlightWithObjectList(objectList) {

        if (this.objects && this.objects.length === objectList.length) {

            const delta = objectList.filter((object, i) => object.uuid !== this.objects[ i ].uuid)
            if (0 === delta.length) {
                return
            }

        }

        // this.unhighlight()
        this.objects = [ ...objectList ]
        this.highlight()
    }

    highlight() {

        if (undefined === pointCloud.meshList) {
            return
        }

        for (const { geometry } of pointCloud.meshList) {
            geometry.setAttribute('color', geometry.userData.deemphasisColorAttribute)
            geometry.attributes.color.needsUpdate = true
        }

        for (const { geometry } of this.objects) {
            geometry.setAttribute('color', geometry.userData.colorAttribute )
            geometry.attributes.color.needsUpdate = true
        }
    }

    unhighlight() {

        if (undefined === pointCloud.meshList) {
            return
        }

        for (const { geometry }  of pointCloud.meshList) {
            geometry.setAttribute('color', geometry.userData.colorAttribute )
            geometry.attributes.color.needsUpdate = true
        }

        this.objects = undefined
    }

}

export default PointCloudHighlighter
