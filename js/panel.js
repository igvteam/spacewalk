import hic from '../node_modules/juicebox.js/dist/juicebox.esm.js';
import { makeDraggable } from "./draggable.js";
import { eventBus } from "./app.js";
import { setPanelVisibility } from "./guiManager.js";

let panelList = undefined;

class Panel {

    constructor({ container, panel, isHidden, xFunction, yFunction }) {

        this.container = container;

        this.panel = panel;
        this.$panel = $(panel);

        this.isHidden = isHidden;

        this.xFunction = xFunction;
        this.yFunction = yFunction;

        this.namespace = `panel.${ hic.igv.guid() }`;

        const $drag_handle = this.$panel.find('.spacewalk_card_drag_container');
        makeDraggable(panel, $drag_handle.get(0));

        $drag_handle.on(`mousedown.${ this.namespace }`, event => {
            eventBus.post({ type: "DidSelectPanel", data: this.$panel });
        });

        const $closer = this.$panel.find('i.fa-times-circle');
        $closer.on(`click.${ hic.igv.guid() }`, event => {
            event.stopPropagation();
            this.dismiss();
        });

        this.$panel.on(`mouseenter.${ this.namespace }`, (event) => {
            event.stopPropagation();
            eventBus.post({ type: 'DidEnterGUI', data: this });
        });

        this.$panel.on(`mouseleave.${ this.namespace }`, (event) => {
            event.stopPropagation();
            eventBus.post({ type: 'DidLeaveGUI', data: this });
        });

        eventBus.subscribe("ToggleUIControl", this);
        eventBus.subscribe("AppWindowDidResize", this);
        eventBus.subscribe("DidDragEnd", this);

    }

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
        setPanelVisibility(this.$panel.attr('id'), false);
    };

    present() {

        if (this.isHidden) {
            this.$panel.offset(this.getOffset());
            this.isHidden = false;
        }

        setPanelVisibility(this.$panel.attr('id'), true);

    };

    receiveEvent({ type, data }) {

        if ("ToggleUIControl" === type && data && data.payload === this.$panel.attr('id')) {

            if (true === this.isHidden) {
                this.present();
            } else {
                this.dismiss();
            }

        } else if ('AppWindowDidResize' === type) {

            if (false === this.isHidden) {
                this.$panel.offset(this.getOffset());
            }

        } else if ('DidDragEnd' === type && data && data === this.$panel.attr('id')) {
            this.setTopLeftPercentages(true);
        }
    }

    static setPanelList(panels) {
        panelList = panels;
    }

    static setAllPanelVisibility(panelVisibility) {

        Panel.getPanelList().forEach( panel => {
            if ('visible' === panelVisibility[ panel.constructor.name ]) {
                panel.present();
            } else {
                panel.dismiss();
            }
        });

    }

    static getPanelList() {
        return panelList;
    }

}

export default Panel;
