import hic from '../node_modules/juicebox.js/dist/juicebox.esm.js';
import { makeDraggable } from "./draggable.js";
import { guiManager, eventBus } from "./app.js";

let panelList = undefined;

class Panel {

    constructor({ container, panel, isHidden, xFunction, yFunction }) {

        this.container = container;
        this.$panel = $(panel);
        this.isHidden = isHidden;
        this.xFunction = xFunction;
        this.yFunction = yFunction;

        this.layoutState = undefined;

        if (false === this.isHidden) {
            this.initializeLayout(xFunction, yFunction, container);
        }

        const namespace = `panel.${ hic.igv.guid() }`;

        const $drag_handle = this.$panel.find('.spacewalk_card_drag_container');
        makeDraggable(panel, $drag_handle.get(0));

        $drag_handle.on(`mousedown.${ namespace }`, event => {
            eventBus.post({ type: "DidSelectPanel", data: this.$panel });
        });

        const $closer = this.$panel.find('i.fa-times-circle');
        $closer.on(`click.${ hic.igv.guid() }`, event => {
            event.stopPropagation();
            this.dismiss();
        });

        this.$panel.on(`mouseenter.${ namespace }`, (event) => {
            event.stopPropagation();
            eventBus.post({ type: "DidEnterGUI" });
        });

        this.$panel.on(`mouseleave.${ namespace }`, (event) => {
            event.stopPropagation();
            eventBus.post({ type: "DidLeaveGUI" });
        });

        eventBus.subscribe("ToggleUIControl", this);
        eventBus.subscribe("AppWindowDidResize", this);
        eventBus.subscribe("DidDragEnd", this);

    }

    receiveEvent({ type, data }) {

        if ("ToggleUIControl" === type && data && data.payload === this.$panel.attr('id')) {

            if (true === this.isHidden) {
                this.present();
            } else {
                this.dismiss();
            }

        } else if ('AppWindowDidResize' === type) {

            if (false === this.isHidden) {
                this.layout();
            }

        } else if ('DidDragEnd' === type && data && data === this.$panel.attr('id')) {
            this.saveLayoutState(this.container, this.$panel);
        }
    }

    initializeLayout(xFunction, yFunction, container) {

        const { width, height } = container.getBoundingClientRect();
        const { width: width_p, height: height_p } = this.$panel.get(0).getBoundingClientRect();

        const left = xFunction(width,   width_p);
        const  top = yFunction(height, height_p);

        this.$panel.offset( { left, top } );

        this.saveLayoutState(this.container, this.$panel);
    }

    getOffset() {
        const { width, height } = this.container.getBoundingClientRect();
        const { topPercent, leftPercent } = this.layoutState;
        const top = topPercent * height;
        const left = leftPercent * width;
        return { top, left };
    }

    layout(){

        if (this.layoutState) {
            this.$panel.offset(this.getOffset())
        } else {
            this.initializeLayout(this.xFunction, this.yFunction, this.container)
        }

    };

    dismiss() {

        this.saveLayoutState(this.container, this.$panel);
        this.isHidden = true;

        this.$panel.offset( { left: -1000, top: -1000 } );

        guiManager.setPanelVisibility(this.$panel.attr('id'), false);

    };

    present() {

        if (this.isHidden) {
            this.layout();
            this.isHidden = false;
        }

        guiManager.setPanelVisibility(this.$panel.attr('id'), true);

    };

    saveLayoutState(container, $panel) {
        const { width, height } = container.getBoundingClientRect();
        const { top, left } = $panel.offset();
        const topPercent = top / height;
        const leftPercent = left / width;
        this.layoutState = { topPercent, leftPercent };
    }

    static setPanelList(panels) {
        panelList = panels;
    }

    static getPanelList() {
        return panelList;
    }
}

export default Panel;
