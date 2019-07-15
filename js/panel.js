import Globals from "./globals.js";
import { makeDraggable } from "./draggable.js";
import { guiManager } from "./gui.js";

class Panel {

    constructor({ container, panel, isHidden, xFunction, yFunction }) {

        this.container = container;
        this.$panel = $(panel);
        this.isHidden = isHidden;
        this.xFunction = xFunction;
        this.yFunction = yFunction;

        if (false === this.isHidden) {
            this.initializeLayout(xFunction, yFunction);
        }

        makeDraggable(panel, this.$panel.find('.spacewalk_card_drag_container').get(0));

        this.$panel.on('mouseenter.panel', (event) => {
            event.stopPropagation();
            Globals.eventBus.post({ type: "DidEnterGUI" });
        });

        this.$panel.on('mouseleave.panel', (event) => {
            event.stopPropagation();
            Globals.eventBus.post({ type: "DidLeaveGUI" });
        });

        Globals.eventBus.subscribe("ToggleUIControl", this);
        Globals.eventBus.subscribe("AppWindowDidResize", this);
        Globals.eventBus.subscribe("DidDragEnd", this);

    }

    receiveEvent({ type, data }) {

        if ("ToggleUIControl" === type && data && data.payload === this.$panel.attr('id')) {

            if (this.isHidden) {
                this.moveOnScreen();
            } else {
                this.moveOffScreen();
            }

            this.isHidden = !this.isHidden;

        } else if ('AppWindowDidResize' === type) {

            if (false === this.isHidden) {
                this.moveOnScreen();
            }

        } else if ('DidDragEnd' === type) {
            this.updateLayoutState();
        }
    }

    initializeLayout(xFunction, yFunction) {
        const { width: width_container, height: height_container } = $(this.container).get(0).getBoundingClientRect();
        const { width: width_panel,     height: height_panel     } =       this.$panel.get(0).getBoundingClientRect();
        const left = xFunction(width_container,   width_panel);
        const  top = yFunction(height_container, height_panel);
        this.layout(left, top);
    }

    layout (left, top) {
        this.$panel.offset( { left, top } );
        this.updateLayoutState();
    }

    moveOnScreen(){

        if (this.layoutState) {
            const { topPercent, leftPercent } = this.layoutState;
            const top = topPercent * Globals.appWindowHeight;
            const left = leftPercent * Globals.appWindowWidth;
            this.$panel.offset({ top, left })
        } else {
            this.initializeLayout(this.xFunction, this.yFunction)
        }

    };

    moveOffScreen() {
        this.updateLayoutState();
        this.$panel.offset( { left: -1000, top: -1000 } );
    };

    presentPanel() {

        if (this.isHidden) {
            this.moveOnScreen();
            guiManager.panelIsVisible(this.$panel.attr('id'));
            this.isHidden = false;
        }
    };

    updateLayoutState() {
        const { top, left } = this.$panel.offset();
        const topPercent = top / Globals.appWindowHeight;
        const leftPercent = left / Globals.appWindowWidth;
        this.layoutState = { top, left, topPercent, leftPercent };
    }
}

export default Panel;
