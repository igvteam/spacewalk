import { ribbon, noodle, ballAndStick, ensembleManager } from "./app.js";
import {lerp} from "./math.js";

const setMaterialProvider = materialProvider => {
    ribbon.updateMaterialProvider(materialProvider);
    // noodle.updateMaterialProvider(materialProvider);
    ballAndStick.updateMaterialProvider(materialProvider);
};

let fitToContainer = (canvas, devicePixelRatio) => {

    canvas.style.width ='100%';
    canvas.style.height ='100%';

    canvas.width  = devicePixelRatio ? devicePixelRatio * canvas.offsetWidth : canvas.offsetWidth;
    canvas.height = devicePixelRatio ? devicePixelRatio * canvas.offsetHeight : canvas.offsetHeight;
};

let getMouseXY = (domElement, { clientX, clientY }) => {

    // a DOMRect object with eight properties: left, top, right, bottom, x, y, width, height
    const { left, top, width, height } = domElement.getBoundingClientRect();

    return { x: clientX - left,  y: clientY - top, xNormalized: (clientX - left)/width, yNormalized: (clientY - top)/height };

};

let throttle = (fn, threshhold, scope) => {

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
};

const readFileAsDataURL = async blob => {

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
};

const createImage = imageSource => {

    return new Promise((resolve, reject) => {
        let img = new Image();
        img.addEventListener('load', e => resolve(img));
        img.addEventListener('error', () => { reject(new Error(`Failed to load image's URL: ${imageSource}`)); });
        img.src = imageSource;
    });

};

const drawWithSharedUint8ClampedArray = async (ctx, size, array) => {

    const { width, height } = size;

    const imageData = new ImageData(array, ensembleManager.maximumSegmentID, ensembleManager.maximumSegmentID);

    const config =
        {
            resizeWidth: width,
            resizeHeight: height
        };

    // const imageBitmap = await createImageBitmap(imageData, config);
    const imageBitmap = await createImageBitmap(imageData);
    ctx.transferFromImageBitmap(imageBitmap);

};

const generateRadiusTable = defaultRadius => {

    const radiusTableLength = 11;
    const radiusTable = [];

    for (let i = 0; i < radiusTableLength; i++) {
        const interpolant = i / (radiusTableLength - 1);
        const radius = lerp(0.5 * defaultRadius, 2.0 * defaultRadius, interpolant);
        radiusTable.push(radius);
    }

    return radiusTable
};

export {
    setMaterialProvider,
    createImage,
    drawWithSharedUint8ClampedArray,
    readFileAsDataURL,
    fitToContainer,
    getMouseXY,
    throttle,
    generateRadiusTable
};
