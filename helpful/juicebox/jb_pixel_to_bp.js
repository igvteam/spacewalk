let toBP = (posX, posY) => {

    const state = this.browser.state;

    // bp-per-bin
    const resolution = this.browser.resolution();

    // bp = ((bin + pixel/pixel-per-bin) / bp-per-bin)
    const xBP = (state.x + (posX / state.pixelSize)) * resolution;
    const yBP = (state.y + (posY / state.pixelSize)) * resolution;

    return { xBP, yBP };

};
