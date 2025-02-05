import * as THREE from "three"
import {vectorMax, vectorMin} from "./utils/mathUtils.js"
import {createColorPicker} from "./utils/colorUtils.js"
import {appleCrayonColorThreeJS, rgb255String, threeJSColorToRGB255} from "./utils/colorUtils"

class ScaleBarService {

    constructor(renderContainer, isHidden) {
        this.renderContainer = renderContainer

        this.color = appleCrayonColorThreeJS('iron')
        // this.color = appleCrayonColorThreeJS('salmon')

        this.visible = !(isHidden);

        this.colorPicker = createColorPicker(document.querySelector(`div[data-colorpicker='scale-bars']`), this.color, color => this.setColor(color));
    }

    setColor(color){

        const { r, g, b } = color
        this.color.setRGB(r, g, b)
        ScaleBarService.setSVGElementColor('horizontal-scale-bar', this.color)
        ScaleBarService.setSVGElementColor('horizontal-scale-bar-label', this.color)
        ScaleBarService.setSVGElementColor('vertical-scale-bar', this.color)
        ScaleBarService.setSVGElementColor('vertical-scale-bar-label', this.color)
    }

    updateScaleBars(scaleBarBounds) {

        // Position the horizontal scale bar container
        this.horizontalContainer.style.left = `${scaleBarBounds.west}px`;
        this.horizontalContainer.style.top = `${scaleBarBounds.north + 20}px`; // Offset slightly above the object

        // Horizontal Scale Bar
        const horizontalSVG = this.horizontalContainer.querySelector('#horizontal-scale-bar-svg');
        const horizontalBar = this.horizontalContainer.querySelector('#horizontal-scale-bar');
        const horizontalLabel = this.horizontalContainer.querySelector('#horizontal-scale-bar-label');

        // Update SVG dimensions and viewBox
        horizontalSVG.setAttribute('width', `${scaleBarBounds.width}px`);
        horizontalSVG.setAttribute('viewBox', `0 0 ${scaleBarBounds.width} 38`);

        // Update rect dimensions explicitly
        horizontalBar.setAttribute('width', `${scaleBarBounds.width}`);
        horizontalBar.setAttribute('height', `5`); // Fixed bar height

        // Update label text
        // horizontalLabel.textContent = `${scaleBarBounds.widthNM.toFixed(2)} nm`;
        horizontalLabel.textContent = `${Math.round(scaleBarBounds.widthNM)} nm`;

        // Position the vertical scale bar container
        this.verticalContainer.style.left = `${scaleBarBounds.west - 38}px`; // Position to the left of the data
        this.verticalContainer.style.top = `${scaleBarBounds.south}px`;

        // Vertical Scale Bar
        const verticalSVG = this.verticalContainer.querySelector('#vertical-scale-bar-svg');
        const verticalBar = this.verticalContainer.querySelector('#vertical-scale-bar');
        const verticalLabel = this.verticalContainer.querySelector('#vertical-scale-bar-label');

        // Update SVG dimensions and viewBox
        verticalSVG.setAttribute('height', `${scaleBarBounds.height}px`);
        verticalSVG.setAttribute('viewBox', `0 0 38 ${scaleBarBounds.height}`);

        // Update rect dimensions explicitly
        verticalBar.setAttribute('width', `5`); // Fixed bar width
        verticalBar.setAttribute('height', `${scaleBarBounds.height}`);

        // Calculate the midpoint of the bar
        const labelY = scaleBarBounds.height / 2;

        // Update label positioning
        verticalLabel.setAttribute('y', `${labelY}`);
        verticalLabel.setAttribute('transform', `rotate(-90, 18, ${labelY})`);
        // verticalLabel.textContent = `${scaleBarBounds.heightNM.toFixed(2)} nm`;
        verticalLabel.textContent = `${Math.round(scaleBarBounds.heightNM)} nm`;
    }

    scaleBarAnimationLoopHelper(convexHullMesh, camera){

        const scaleBarBounds = ScaleBarService.calculateScaleBarBounds(convexHullMesh, camera, this.renderContainer)

        this.updateScaleBars(scaleBarBounds)

    }

    insertScaleBarDOM() {

        let fragment
        let bar
        let label

        const horizontalHTML =
            `<div id="spacewalk-horizontal-scale-bar-container" style="position: absolute;user-select: none;; display: none">
              <svg id="horizontal-scale-bar-svg" xmlns="http://www.w3.org/2000/svg" height="38px" viewBox="0 0 372 38" preserveAspectRatio="none">
                <rect id="horizontal-scale-bar" x="0" y="4" width="100%" height="5" fill="grey"></rect>
                <text id="horizontal-scale-bar-label" x="50%" y="30" font-family="HelveticaNeue-Light, Helvetica Neue" font-size="18" font-weight="300" letter-spacing="0.75" fill="black" text-anchor="middle">
                  25nm
                </text>
              </svg>
            </div>`

        fragment = document.createRange().createContextualFragment(horizontalHTML)
        this.horizontalContainer =  fragment.firstChild
        this.renderContainer.appendChild(this.horizontalContainer)

        const verticalHTML =
            `<div id="spacewalk-vertical-scale-bar-container" style="position: absolute;user-select: none; display: none">
              <svg id="vertical-scale-bar-svg" xmlns="http://www.w3.org/2000/svg" width="38px" viewBox="0 0 38 266" preserveAspectRatio="none">
                <rect id="vertical-scale-bar" x="24" y="0" width="5" height="100%" fill="grey"></rect>
                <text id="vertical-scale-bar-label" x="18" y="133" font-family="HelveticaNeue-Light, Helvetica Neue" font-size="18" font-weight="300" letter-spacing="0.75" fill="black" text-anchor="middle" transform="rotate(-90, 18, 133)">
                  25nm
                </text>
              </svg>
            </div>`

        fragment = document.createRange().createContextualFragment(verticalHTML)
        this.verticalContainer =  fragment.firstChild
        this.renderContainer.appendChild(this.verticalContainer)

        ScaleBarService.setSVGElementColor('horizontal-scale-bar', this.color)
        ScaleBarService.setSVGElementColor('horizontal-scale-bar-label', this.color)
        ScaleBarService.setSVGElementColor('vertical-scale-bar', this.color)
        ScaleBarService.setSVGElementColor('vertical-scale-bar-label', this.color)

    }

    toggle() {
        const status = !this.visible
        this.setVisibility(status)
    }

    setVisibility(status) {
        true === status ? this.present() : this.dismiss()
    }

    present() {
        this.visible = true;
        this.horizontalContainer.style.display = 'block'
        this.verticalContainer.style.display = 'block'
        ScaleBarService.setRulerWidgetVisibilityStatus(this.visible);
    }

    dismiss() {
        this.visible = false;
        this.horizontalContainer.style.display = 'none'
        this.verticalContainer.style.display = 'none'
        ScaleBarService.setRulerWidgetVisibilityStatus(this.visible);
    }

    static setSVGElementColor(elementID, color){
        const element = document.getElementById(`${ elementID }`)
        element.setAttribute("fill", `${ rgb255String(threeJSColorToRGB255(color)) }`)
    }

    static calculateScaleBarBounds(convexHullMesh, camera, container) {

        let xyzCameraMin = new THREE.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)
        let xyzCameraMax = new THREE.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY)

        let ndcMin = new THREE.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)
        let ndcMax = new THREE.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY)

        const vertices = convexHullMesh.geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {

            // Object space
            const vertex = new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2])

            // Camera space
            const xyzCamera = vertex.clone().applyMatrix4(camera.matrixWorldInverse)
            xyzCameraMin = vectorMin(xyzCameraMin, xyzCamera)
            xyzCameraMax = vectorMax(xyzCameraMax, xyzCamera)

            // World space
            const xyzWorld = vertex.clone().applyMatrix4(convexHullMesh.matrixWorld)

            // NDC space
            const ndc = xyzWorld.clone().project(camera)
            ndcMin = vectorMin(ndcMin, ndc)
            ndcMax = vectorMax(ndcMax, ndc)

        }

        // ndc: convert to 0 -> 1
        const ndcMin01X = 0.5 * ndcMin.x + 0.5
        const ndcMax01X = 0.5 * ndcMax.x + 0.5

        // ndc: y-axis is flipped
        const ndcMax01Y = -0.5 * ndcMin.y + 0.5
        const ndcMin01Y = -0.5 * ndcMax.y + 0.5

        // camera space extent (world space distances)
        const widthNM = xyzCameraMax.x - xyzCameraMin.x
        const heightNM = xyzCameraMax.y - xyzCameraMin.y

        const { width:cardBodyWidth, height:cardBodyHeight } = container.getBoundingClientRect()

        const south = ndcMin01Y * cardBodyHeight
        const north = ndcMax01Y * cardBodyHeight

        const west = ndcMin01X * cardBodyWidth
        const east = ndcMax01X * cardBodyWidth

        const width =  east - west
        const height = north - south

        return { north, south, east, west, width, height, widthNM, heightNM }

    }

    static setRulerWidgetVisibilityStatus(status) {
        const input = document.getElementById('spacewalk_ui_manager_scale_bars');
        if (input) {
            input.checked = status;
        }
    }

    static setScaleBarsHidden() {
        const input = document.getElementById('spacewalk_ui_manager_scale_bars')
        const status = input.checked
        return !status
    }

}

export default ScaleBarService
