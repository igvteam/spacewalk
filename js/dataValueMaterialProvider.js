class DataValueMaterialProvider {

    constructor ({ width, height }) {
        let canvas;

        // rgb
        canvas = document.createElement('canvas');
        this.rgb_ctx = canvas.getContext('2d');
        configureCanvas(this.rgb_ctx, width, height);

        // alpha
        canvas = document.createElement('canvas');
        this.alpha_ctx = canvas.getContext('2d');
        configureCanvas(this.alpha_ctx, width, height);

    }
}

let configureCanvas = (ctx, width, height) => {

    ctx.canvas.width = width * window.devicePixelRatio;
    ctx.canvas.height = height * window.devicePixelRatio;

    ctx.canvas.style.width = width + 'px';
    ctx.canvas.style.height = height + 'px';

};

export default DataValueMaterialProvider;
