
let moveOnScreen = (panelHost) => {
    panelHost.layout(panelHost.container, panelHost.$panel.get(0));
};

let moveOffScreen = (panelHost) => {

    // const { left, top, right, bottom, x, y, width, height } = container.getBoundingClientRect();
    const { x: c_x, y:c_y, width: c_w, height: c_h } = panelHost.container.getBoundingClientRect();

    const left = c_x - c_w;
    const top = c_y - c_y;
    panelHost.$panel.offset( { left, top } );
};

let fitToContainer = (canvas, devicePixelRatio) => {

    canvas.style.width ='100%';
    canvas.style.height ='100%';

    canvas.width  = devicePixelRatio ? devicePixelRatio * canvas.offsetWidth : canvas.offsetWidth;
    canvas.height = devicePixelRatio ? devicePixelRatio * canvas.offsetHeight : canvas.offsetHeight;
};

let fillCanvasContextRect = (ctx, colorString) => {
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

const readFileAsText = async file => {

    const fileReader = new FileReader();

    return new Promise((resolve, reject) => {
        fileReader.onerror = () => {
            fileReader.abort();
            reject(new DOMException("Problem parsing input file."));
        };

        fileReader.onload = () => {
            resolve(fileReader.result);
        };

        fileReader.readAsText(file);
    });
};

export { readFileAsText, moveOnScreen, moveOffScreen, fitToContainer, getMouseXY, throttle, numberFormatter, fillCanvasContextRect };
