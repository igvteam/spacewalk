import { DOMUtils } from 'igv-utils'
import SpacewalkEventBus from './spacewalkEventBus.js'
import { makeDraggable } from "./draggable.js"

const zIndexPanelSelected = 1124;
const zIndexPanelUnselected = 1024;

const panelDictionary = {}

class Panel {

    constructor({ container, panel, isHidden, xFunction, yFunction }) {

        this.container = container;

        this.panel = panel;
        this.$panel = $(panel);

        this.isHidden = isHidden;

        this.xFunction = xFunction;
        this.yFunction = yFunction;

        this.namespace = `panel.${ DOMUtils.guid() }`;

        const $drag_handle = this.$panel.find('.spacewalk_card_drag_container');
        makeDraggable(panel, $drag_handle.get(0));

        $drag_handle.on(`mousedown.${ this.namespace }`, event => {
            event.stopPropagation();
            event.preventDefault();
            SpacewalkEventBus.globalBus.post({ type: "DidSelectPanel", data: this.getClassName() })
        });

        const $closer = this.$panel.find('i.fa-times-circle');
        $closer.on(`click.${ DOMUtils.guid() }`, event => {
            event.stopPropagation();
            event.preventDefault();
            this.dismiss();
        });

        this.$panel.on(`mouseenter.${ this.namespace }`, event => {
            event.stopPropagation();
            event.preventDefault();
            SpacewalkEventBus.globalBus.post({ type: 'DidEnterGUI', data: this });
        });

        this.$panel.on(`mouseleave.${ this.namespace }`, event => {
            event.stopPropagation();
            event.preventDefault();
            SpacewalkEventBus.globalBus.post({ type: 'DidLeaveGUI', data: this });
        });

        SpacewalkEventBus.globalBus.subscribe("DidSelectPanel", this);
        SpacewalkEventBus.globalBus.subscribe("ToggleUIControl", this);
        SpacewalkEventBus.globalBus.subscribe("AppWindowDidResize", this);
        SpacewalkEventBus.globalBus.subscribe("DidEndDrag", this);

    }

    receiveEvent({ type, data }) {

        if ('DidSelectPanel' === type) {
            this.$panel.css('zIndex', this.getClassName() === data ? zIndexPanelSelected : zIndexPanelUnselected)
        } else if ("ToggleUIControl" === type && data && data.payload === this.$panel.attr('id')) {
            true === this.isHidden ? this.present() : this.dismiss()
        } else if ('AppWindowDidResize' === type && false === this.isHidden) {
            this.$panel.offset(this.getOffset())
        } else if ('DidEndDrag' === type && data && data === this.$panel.attr('id')) {
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
        this.$panel.offset( { left: -1000, top: -1000 } );

        const id = this.$panel.attr('id')
        const $selection = $(`input[data-target='${ id }']`)
        $selection.prop('checked', false)

    }

    present() {

        if (this.isHidden) {
            this.$panel.offset(this.getOffset());
            this.isHidden = false;
        }

        const id = this.$panel.attr('id')
        const $selection = $(`input[data-target='${ id }']`)
        $selection.prop('checked', true)

    };

    static setAllPanelVisibility(panelVisibility) {

        for (let [key, value] of Object.entries( Panel.getPanelDictionary() )) {

            if ('visible' === panelVisibility[ key ]) {
                value.present();
            } else {
                value.dismiss();
            }

        }

    }

    static getPanelDictionary() {
        return panelDictionary
    }

    static setPanelDictionary(panels) {
        for (let panel of panels) {
            panelDictionary[ panel.getClassName() ] = panel
        }
    }

}

export function doInspectPanelVisibilityCheckbox(panelID) {
    const $selection = $(`input[data-target='${ panelID }']`)
    return !($selection.prop('checked'))
}

export default Panel;
