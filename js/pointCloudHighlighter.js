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

        for (const mesh of pointCloud.meshList) {
            mesh.material = pointCloud.deemphasizedMaterial
            mesh.geometry.setAttribute('color', mesh.geometry.userData.deemphasisColorAttribute)
            mesh.geometry.attributes.color.needsUpdate = true
        }

        for (const mesh of this.objects) {
            mesh.material = pointCloud.material
            mesh.geometry.setAttribute('color', mesh.geometry.userData.colorAttribute )
            mesh.geometry.attributes.color.needsUpdate = true
        }
    }

    unhighlight() {

        if (undefined === pointCloud.meshList) {
            return
        }

        for (const mesh of pointCloud.meshList) {
            mesh.material = pointCloud.material
            mesh.geometry.setAttribute('color', mesh.geometry.userData.colorAttribute )
            mesh.geometry.attributes.color.needsUpdate = true
        }

        this.objects = undefined
    }

}

export default PointCloudHighlighter
