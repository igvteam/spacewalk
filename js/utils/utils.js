import {
    ribbon,
    ballAndStick,
    pointCloud,
    ensembleManager,
    dataValueMaterialProvider,
    colorRampMaterialProvider
} from "../app.js";
import {lerp} from "./mathUtils.js";
import {appleCrayonColorRGB255} from './colorUtils.js'

function showGlobalSpinner() {
    document.getElementById('spacewalk-spinner').style.display = 'block'
}

function hideGlobalSpinner() {
    document.getElementById('spacewalk-spinner').style.display = 'none'
}

function unsetDataMaterialProviderCheckbox(trackViews) {
    for (const trackView of trackViews) {
        $(trackView.materialProviderInput).prop('checked', false)
    }

}

async function getMaterialProvider(track) {

    // unselect other track's checkboxes
    for (let trackView of track.browser.trackViews) {
        if (trackView.track !== track && trackView.materialProviderInput) {
            $(trackView.materialProviderInput).prop('checked', false)
        }
    }

    if ($(track.trackView.materialProviderInput).is(':checked')) {

        // If "zoom in" notice is displayed do not paint features on trace
        if (track.trackView.viewports[ 0 ].$zoomInNotice.is(":visible")) {
            console.warn(`Track ${ track.name } is showing Zoom In message. Can not render track features on trace`)
            return colorRampMaterialProvider
        } else {
            await dataValueMaterialProvider.configure(track)
            return dataValueMaterialProvider
        }

    } else {
        return colorRampMaterialProvider
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

function throttle(fn, threshhold, scope) {

    threshhold || (threshhold = 200);

    let last;
    let deferTimer;
    return function () {

        let [ context, now, args ] = [ scope || this, +new Date, arguments ];

        if (last && now < last + threshhold) {
            clearTimeout(deferTimer);
            deferTimer = setTimeout(() => { last = now; fn.apply(context, args); }, threshhold);
        } else {
            last = now;
            fn.apply(context, args);
        }
    }
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
    throttle
};
