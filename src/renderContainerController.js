import { EventBus } from 'igv-widgets'
import { configureRenderContainerDrag } from './renderContainerDrag.js'

class RenderContainerController {

    constructor(rootContainer, sceneManager) {

        this.rootContainer = rootContainer;
        this.sceneManager = sceneManager;

        const { container } = sceneManager;

        this.setTopLeftPercentages(rootContainer, container);

        const config =
            {
                handles: "w, sw, s, se, e",
                autoHide: true,
                aspectRatio: true,
                helper: "spacewalk-threejs-container-resizable-helper",
                stop: () => {
                    sceneManager.resizeContainer()
                }
            };

        $(sceneManager.container).resizable(config)

        const dragConfig =
            {
                target: container,
                handle: container.querySelector('#spacewalk-threejs-drag-container'),
                container: document.getElementById('spacewalk-root-container'),
                topConstraint: document.querySelector('.navbar').getBoundingClientRect().height
            }

        configureRenderContainerDrag(dragConfig)

        EventBus.globalBus.subscribe("AppWindowDidResize", this);
        EventBus.globalBus.subscribe("DidEndRenderContainerDrag", this);

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
        } else if ('DidEndRenderContainerDrag' === type) {
            this.setTopLeftPercentages(this.rootContainer, this.sceneManager.container);
        }
    }

}

export default RenderContainerController
