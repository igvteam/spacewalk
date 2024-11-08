import igv from 'igv'
import SpacewalkEventBus from './spacewalkEventBus.js'
import { makeDraggable } from "./utils/draggable.js"

const zIndexPanelSelected = 1124;
const zIndexPanelUnselected = 1024;

const panelDictionary = {}

class Panel {

    constructor({ container, panel, isHidden, xFunction, yFunction }) {

        this.container = container

        this.panel = panel

        this.isHidden = isHidden

        this.xFunction = xFunction
        this.yFunction = yFunction

        const dragHandle = panel.querySelector('.spacewalk_card_drag_container')
        makeDraggable(panel, dragHandle)

        dragHandle.addEventListener(`mousedown`, (event) => {
            event.stopPropagation();
            event.preventDefault();
            SpacewalkEventBus.globalBus.post({ type: "DidSelectPanel", data: this.getClassName() });
        });

        const closer = dragHandle.querySelector('.fa-times-circle');
        closer.addEventListener('click', (event) => {
            event.stopPropagation();
            event.preventDefault();
            this.dismiss();
        });

        SpacewalkEventBus.globalBus.subscribe('DidSelectPanel', this)
        SpacewalkEventBus.globalBus.subscribe('ToggleUIControl', this)
        SpacewalkEventBus.globalBus.subscribe('AppWindowDidResize', this)
        SpacewalkEventBus.globalBus.subscribe('DidEndDrag', this)
    }

    receiveEvent({ type, data }) {

        if ('DidSelectPanel' === type) {
            this.panel.style.zIndex = this.getClassName() === data ? zIndexPanelSelected : zIndexPanelUnselected;
        } else if ("ToggleUIControl" === type && data && data.payload === this.panel.getAttribute('id')) {
            this.isHidden ? this.present() : this.dismiss();
        } else if ('AppWindowDidResize' === type && !this.isHidden) {
            const offset = this.getOffset();
            this.panel.style.left = `${offset.left}px`;
            this.panel.style.top = `${offset.top}px`;
        } else if ('DidEndDrag' === type && data && data === this.panel.getAttribute('id')) {
            this.setTopLeftPercentages(true);
        }
    }

    getClassName(){ return 'Panel' }

    setTopLeftPercentages(isInitialized) {

        const { width, height } = this.container.getBoundingClientRect();
        let { left: leftPanel, top: topPanel, width: widthPanel, height: heightPanel } = this.panel.getBoundingClientRect();

        if (!isInitialized) {
            leftPanel = this.xFunction(width,   widthPanel);
            topPanel = this.yFunction(height, heightPanel);
        }

        this.leftPercent = leftPanel / width;
        this.topPercent = topPanel / height;

    }

    getOffset() {
        const { width, height } = this.container.getBoundingClientRect();

        if (undefined === this.leftPercent && undefined === this.topPercent) {
            this.setTopLeftPercentages(false);
        }
        const left = Math.floor(this.leftPercent * width);
        const top = Math.floor(this.topPercent * height);
        return { top, left };
    }

    dismiss() {

        this.isHidden = true;
        this.panel.style.left = '-1000px';
        this.panel.style.top = '-1000px';

        const id = this.panel.getAttribute('id');
        const selection = document.querySelector(`input[data-target='${id}']`);
        if (selection) {
            selection.checked = false;
        }
    }

    present() {

        if (this.isHidden) {
            const offset = this.getOffset();
            this.panel.style.left = `${offset.left}px`;
            this.panel.style.top = `${offset.top}px`;
            this.isHidden = false;
        }

        const id = this.panel.getAttribute('id');
        const selection = document.querySelector(`input[data-target='${id}']`);
        if (selection) {
            selection.checked = true;
        }
    }

    static setPanelDictionary(panels) {
        for (let panel of panels) {
            panelDictionary[ panel.getClassName() ] = panel
        }
    }

    static setState(panelVisibility) {

        for (let [key, value] of Object.entries( panelDictionary )) {

            if ('visible' === panelVisibility[ key ]) {
                value.present();
            } else {
                value.dismiss();
            }

        }

    }

    static toJSON() {

        const json = {}
        for (let [key, value] of Object.entries( panelDictionary )) {
            json[ key ] = true === value.isHidden ? 'hidden' : 'visible'
        }

        return json
    }
}

function doInspectPanelVisibilityCheckbox(panelID) {
    const selection = document.querySelector(`input[data-target='${panelID}']`);
    return !(selection && selection.checked);
}

export { doInspectPanelVisibilityCheckbox }
export default Panel;
