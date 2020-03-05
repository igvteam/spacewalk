import Dragger from "./dragger.js";
import { appleCrayonColorRGB255, rgb255String } from "./color.js";

let dragger;

class RenderContainerController {

    constructor(sceneManager) {

        const { container } = sceneManager;

        const config =
            {
                autoHide: true,
                aspectRatio: true,
                helper: "spacewalk-threejs-container-resizable-helper",
                stop: () => sceneManager.containerResize()
            };

        $(container).resizable(config);

        container.addEventListener("change", () => sceneManager.renderer.render(sceneManager.scene, sceneManager.cameraLightingRig.object));

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

    }


}

export default RenderContainerController
