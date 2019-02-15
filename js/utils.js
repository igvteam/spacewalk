import { quantize } from './math.js';
import { greyScale255 } from './color.js';

export let quantizedGradientCanvasContextRect = (ctx, a, b) => {

    const yIndices = new Array(ctx.canvas.offsetHeight);

    for (let y = 0;  y < yIndices.length; y++) {

        let value = y / yIndices.length;
        value = quantize(value, 65);
        value = 1.0 - value;


        const { r, g, b } = greyScale255(255 * value);
        ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
        ctx.fillRect(0, y, ctx.canvas.offsetWidth, 1);
    }

};

export let gradientCanvasContextRect = (ctx, colorStringList) => {

    let gradient = ctx.createLinearGradient(0, 0, 0,ctx.canvas.offsetHeight);

    colorStringList.forEach((colorString, i, array) => {
        const interpolant = i / (array.length - 1);
        gradient.addColorStop(interpolant, colorString);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctx.canvas.offsetWidth, ctx.canvas.offsetHeight);
};

export let fillCanvasContextRect = (ctx, colorString) => {
    ctx.fillStyle = colorString;
    ctx.fillRect(0, 0, ctx.canvas.offsetWidth, ctx.canvas.offsetHeight);
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

let numberFormatter = (rawNumber) => {

    const [ dec, sep, decsep ] = [ String(rawNumber).split(/[.,]/), ',', '.' ];

    return dec[ 0 ]
        .split('')
        .reverse()
        .reduce((accumulator, value, index) => {
            return 0 === index % 3 ? accumulator + sep + value : accumulator + value;
        })
        .split('')
        .reverse()
        .join('') + (dec[1] ? decsep + dec[1] : '');
};

export { getMouseXY, throttle, numberFormatter };
