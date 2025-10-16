import * as THREE from 'three';

function calculateTightFittingBounds(mesh, camera) {

    const vertices = mesh.geometry.attributes.position.array;

    let xyzCameraMin = new THREE.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)
    let xyzCameraMax = new THREE.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY)

    let ndcMin = new THREE.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)
    let ndcMax = new THREE.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY)

    for (let i = 0; i < vertices.length; i += 3) {

        // Object space
        const vertex = new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2])

        // Camera space
        const xyzCamera = vertex.clone().applyMatrix4(camera.matrixWorldInverse)
        xyzCameraMin = vectorMin(xyzCameraMin, xyzCamera)
        xyzCameraMax = vectorMax(xyzCameraMax, xyzCamera)

        // World space
        const xyzWorld = vertex.clone().applyMatrix4(mesh.matrixWorld)

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

    const { width:cardBodyWidth, height:cardBodyHeight } = cardBody.getBoundingClientRect()

    const south = ndcMin01Y * cardBodyHeight
    const north = ndcMax01Y * cardBodyHeight

    const west = ndcMin01X * cardBodyWidth
    const east = ndcMax01X * cardBodyWidth

    const width =  east - west
    const height = north - south

    return { north, south, east, west, width, height, widthNM, heightNM }

}

function vectorMin(v1, v2) {
    return new THREE.Vector3(
        Math.min(v1.x, v2.x),
        Math.min(v1.y, v2.y),
        Math.min(v1.z, v2.z)
    );
}

function vectorMax(v1, v2) {
    return new THREE.Vector3(
        Math.max(v1.x, v2.x),
        Math.max(v1.y, v2.y),
        Math.max(v1.z, v2.z)
    );
}


function updateScreenScaleBars(bounds) {
    // Horizontal Scale Bar
    const horizontalContainer = document.getElementById('horizontal-scale-bar-container');
    const horizontalSVG = document.getElementById('horizontal-scale-bar-svg');
    const horizontalBar = document.getElementById('horizontal-scale-bar');
    const horizontalLabel = document.getElementById('horizontal-scale-bar-label');

    // Position the horizontal scale bar container
    horizontalContainer.style.left = `${bounds.west}px`;
    horizontalContainer.style.top = `${bounds.north + 20}px`; // Offset slightly above the object

    // Update SVG dimensions and viewBox
    horizontalSVG.setAttribute('width', `${bounds.width}px`);
    horizontalSVG.setAttribute('viewBox', `0 0 ${bounds.width} 38`);

    // Update rect dimensions explicitly
    horizontalBar.setAttribute('width', `${bounds.width}`);
    horizontalBar.setAttribute('height', `5`); // Fixed bar height

    // Update label text
    horizontalLabel.textContent = `${bounds.widthNM.toFixed(2)} nm`;

    // Vertical Scale Bar
    const verticalContainer = document.getElementById('vertical-scale-bar-container');
    const verticalSVG = document.getElementById('vertical-scale-bar-svg');
    const verticalBar = document.getElementById('vertical-scale-bar');
    const verticalLabel = document.getElementById('vertical-scale-bar-label');

    // Position the vertical scale bar container
    verticalContainer.style.left = `${bounds.west - 38}px`; // Position to the left of the data
    verticalContainer.style.top = `${bounds.south}px`;

    // Update SVG dimensions and viewBox
    verticalSVG.setAttribute('height', `${bounds.height}px`);
    verticalSVG.setAttribute('viewBox', `0 0 38 ${bounds.height}`);

    // Update rect dimensions explicitly
    verticalBar.setAttribute('width', `5`); // Fixed bar width
    verticalBar.setAttribute('height', `${bounds.height}`);

    // Calculate the midpoint of the bar
    const labelY = bounds.height / 2;

    // Update label positioning
    verticalLabel.setAttribute('y', `${labelY}`);
    verticalLabel.setAttribute('transform', `rotate(-90, 18, ${labelY})`);
    verticalLabel.textContent = `${bounds.heightNM.toFixed(2)} nm`;
}

function screenScaleBarsRenderHelper(mesh, camera){
    const bounds = calculateTightFittingBounds(mesh, camera)
    updateScreenScaleBars(bounds)

}


export { screenScaleBarsRenderHelper }
