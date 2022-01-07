import SpacewalkEventBus from './spacewalkEventBus.js'
import { configureRenderContainerDrag } from './renderContainerDrag.js'
import { traceNavigator } from './app.js'

class RenderContainerController {

    constructor(rootContainer, sceneManager) {

        const threejsContainer = rootContainer.querySelector('#spacewalk-threejs-container')

        this.setTopLeftPercentages(rootContainer, threejsContainer);

        const config =
            {
                handles: "w, sw, s, se, e",
                autoHide: true,
                aspectRatio: true,
                helper: "spacewalk-threejs-container-resizable-helper",
                stop: () => {
                    sceneManager.resizeContainer()
                    traceNavigator.resize(sceneManager.container)
                }
            };

        $(sceneManager.container).resizable(config)
        // $(threejsContainer).resizable(config)

        const dragConfig =
            {
                target: threejsContainer,
                handle: threejsContainer.querySelector('#spacewalk-threejs-drag-container'),
                container: rootContainer,
                topConstraint: document.querySelector('.navbar').getBoundingClientRect().height
            }

        configureRenderContainerDrag(dragConfig)

        SpacewalkEventBus.globalBus.subscribe("AppWindowDidResize", this);
        SpacewalkEventBus.globalBus.subscribe("DidEndRenderContainerDrag", this);

        this.sceneManager = sceneManager;

    }

    setTopLeftPercentages(rootContainer, threejsContainer) {

        const { width, height } = rootContainer.getBoundingClientRect();
        const { left, top } = threejsContainer.getBoundingClientRect();

        this.leftPercent = left / width;
        this.topPercent = top / height;
    }

    getOffset(rootContainer) {
        const { width, height } = rootContainer.getBoundingClientRect();
        const left = Math.floor(this.leftPercent * width);
        const top = Math.floor(this.topPercent * height);
        return { top, left };
    }

    // receiveEvent({ type, data }) {
    //
    //     if ('AppWindowDidResize' === type) {
    //         $(this.sceneManager.container).offset(this.getOffset(this.rootContainer))
    //     } else if ('DidEndRenderContainerDrag' === type) {
    //         this.setTopLeftPercentages(this.rootContainer, this.sceneManager.container);
    //     }
    // }

}

export default RenderContainerController
