
let gradientCanvasContextRect = (ctx, colorStringList) => {

    let gradient = ctx.createLinearGradient(0, 0, 0,ctx.canvas.offsetHeight);

    colorStringList.forEach((colorString, i, array) => {
        const interpolant = i / (array.length - 1);
        gradient.addColorStop(interpolant, colorString);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctx.canvas.offsetWidth, ctx.canvas.offsetHeight);
};

let fillCanvasContextRect = (ctx, colorString) => {
    ctx.fillStyle = colorString;
    ctx.fillRect(0, 0, ctx.canvas.offsetWidth, ctx.canvas.offsetHeight);
};

let getMouseXY = (domElement, event) => {

    const rect = domElement.getBoundingClientRect();

    return { x: event.clientX - rect.left,  y: event.clientY - rect.top };

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

export { getMouseXY, throttle, numberFormatter, fillCanvasContextRect, gradientCanvasContextRect };
