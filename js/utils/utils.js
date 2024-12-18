import {
    ribbon,
    ballAndStick,
    pointCloud,
    dataValueMaterialProvider,
    colorRampMaterialProvider
} from "../app.js";

function showGlobalSpinner() {
    document.getElementById('spacewalk-spinner').style.display = 'block'
}

function hideGlobalSpinner() {
    document.getElementById('spacewalk-spinner').style.display = 'none'
}

function unsetDataMaterialProviderCheckbox(trackViews) {
    for (const trackView of trackViews) {
        if (trackView.materialProviderInput) {
            trackView.materialProviderInput.checked = false;
        }
    }
}

async function getMaterialProvider(track) {

    // Unselect other track's checkboxes
    for (let trackView of track.browser.trackViews) {
        if (trackView.track !== track && trackView.materialProviderInput) {
            trackView.materialProviderInput.checked = false;
        }
    }

    if (track.trackView.materialProviderInput && track.trackView.materialProviderInput.checked) {

        // If "zoom in" notice is displayed do not paint features on trace
        const zoomInNotice = track.trackView.viewports[0].$zoomInNotice.get(0);
        if (zoomInNotice && zoomInNotice.style.display !== 'none') {
            console.warn(`Track ${track.name} is showing Zoom In message. Cannot render track features on trace`);
            return colorRampMaterialProvider;
        } else {
            await dataValueMaterialProvider.configure(track);
            return dataValueMaterialProvider;
        }

    } else {
        return colorRampMaterialProvider;
    }

}

function setMaterialProvider(materialProvider) {
    ribbon.updateMaterialProvider(materialProvider)
    ballAndStick.updateMaterialProvider(materialProvider)
    pointCloud.updateMaterialProvider(materialProvider)
}

function fitToContainer(canvas, devicePixelRatio) {

    canvas.style.width ='100%';
    canvas.style.height ='100%';

    canvas.width  = devicePixelRatio ? devicePixelRatio * canvas.offsetWidth : canvas.offsetWidth;
    canvas.height = devicePixelRatio ? devicePixelRatio * canvas.offsetHeight : canvas.offsetHeight;
}

function getMouseXY(domElement, { clientX, clientY }) {

    // a DOMRect object with eight properties: left, top, right, bottom, x, y, width, height
    const { left, top, width, height } = domElement.getBoundingClientRect();

    return { x: clientX - left,  y: clientY - top, xNormalized: (clientX - left)/width, yNormalized: (clientY - top)/height };

}

function debounce(func, delay) {

    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };

}

function prettyPrint(number) {

    if (typeof number !== "number") {
        console.error(`${ number } must be a number`)
        return
    }

    const integerPart = Math.trunc(number)
    return integerPart.toLocaleString()
}

async function readFileAsDataURL(blob) {

    const fileReader = new FileReader();

    return new Promise((resolve, reject) => {
        fileReader.onerror = () => {
            fileReader.abort();
            reject(new DOMException("Problem parsing input file."));
        };

        fileReader.onload = () => {
            resolve(fileReader.result);
        };

        fileReader.readAsDataURL(blob);
    });
}

function createImage(imageSource) {

    return new Promise((resolve, reject) => {
        let img = new Image();
        img.addEventListener('load', e => resolve(img));
        img.addEventListener('error', () => { reject(new Error(`Failed to load image's URL: ${imageSource}`)); });
        img.src = imageSource;
    });

}

async function transferRGBAMatrixToLiveMapCanvas(ctx, rgbaMatrix, matrixDimension) {

    const imageData = new ImageData(rgbaMatrix, matrixDimension, matrixDimension)

    const imageBitmap = await createImageBitmap(imageData)

    ctx.transferFromImageBitmap(imageBitmap);

}

function disposeThreeJSGroup(group, scene) {

    // Traverse all children of the group
    group.traverse((child) => {
        if (child.isMesh) {
            // Dispose geometry
            if (child.geometry) {
                child.geometry.dispose();
            }

            // Dispose materials
            if (child.material) {
                if (Array.isArray(child.material)) {
                    // Handle case for array of materials
                    child.material.forEach((material) => {
                        if (material.map) material.map.dispose(); // Dispose textures
                        material.dispose(); // Dispose material itself
                    });
                } else {
                    if (child.material.map) child.material.map.dispose(); // Dispose textures
                    child.material.dispose(); // Dispose material itself
                }
            }
        }
    });

    // Remove the group from the scene
    if (scene && scene instanceof THREE.Scene) {
        scene.remove(group)
    }

    // Set group and children to null to break references (optional)
    group.children = []
}

function getPositionArrayWithTrace(trace){
    const aggregateVertices = []
    for (const { x, y, z } of trace.map(({ xyz }) => xyz)) {
        aggregateVertices.push(x, y, z)
    }
    return aggregateVertices
}

export {
    showGlobalSpinner,
    hideGlobalSpinner,
    unsetDataMaterialProviderCheckbox,
    getMaterialProvider,
    setMaterialProvider,
    createImage,
    transferRGBAMatrixToLiveMapCanvas,
    readFileAsDataURL,
    fitToContainer,
    getMouseXY,
    debounce,
    prettyPrint,
    disposeThreeJSGroup,
    getPositionArrayWithTrace
};
