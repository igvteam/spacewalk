import Dragger from "./dragger.js";
import { appleCrayonColorRGB255, rgb255String } from "./color.js";
import { eventBus } from "./app.js";

let dragger;

class RenderContainerController {

    constructor(rootContainer, sceneManager) {

        this.rootContainer = rootContainer;
        this.sceneManager = sceneManager;

        const { container } = sceneManager;

        this.setTopLeftPercentages(rootContainer, container);

        const config =
            {
                autoHide: true,
                aspectRatio: true,
                helper: "spacewalk-threejs-container-resizable-helper",
                stop: () => sceneManager.resizeContainer()
            };

        $(container).resizable(config);

        const dragContainer = container.querySelector('#spacewalk-threejs-drag-container');

        const { height } = document.querySelector('.navbar').getBoundingClientRect();

        const root_container = document.getElementById('spacewalk-root-container');

        dragger = new Dragger(container, dragContainer, root_container, height);

        dragContainer.addEventListener('mouseenter', () => {
            dragContainer.style.backgroundColor = rgb255String(appleCrayonColorRGB255('snow'));
            dragContainer.querySelector('i').style.color = rgb255String(appleCrayonColorRGB255('steel'));
        });

        dragContainer.addEventListener('mouseleave', () => {
            dragContainer.style.backgroundColor = "transparent";
            dragContainer.querySelector('i').style.color = "transparent";
        });

        eventBus.subscribe("AppWindowDidResize", this);
        eventBus.subscribe("DraggerDidEnd", this);

    }

    setTopLeftPercentages(rootContainer, sceneContainer) {

        const { width, height } = rootContainer.getBoundingClientRect();
        const { left, top } = sceneContainer.getBoundingClientRect();

        this.leftPercent = left / width;
        this.topPercent = top / height;
    }

    getOffset(rootContainer) {
        const { width, height } = rootContainer.getBoundingClientRect();
        const left = Math.floor(this.leftPercent * width);
        const top = Math.floor(this.topPercent * height);
        return { top, left };
    }

    receiveEvent({ type, data }) {

        if ('AppWindowDidResize' === type) {
            $(this.sceneManager.container).offset(this.getOffset(this.rootContainer))
        } else if ('DraggerDidEnd' === type) {
            this.setTopLeftPercentages(this.rootContainer, this.sceneManager.container);
        }
    }

}

export default RenderContainerController
