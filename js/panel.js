import igv from '../vendor/igv.esm.js';
import { makeDraggable } from "./draggable.js";
import { guiManager } from "./gui.js";
import { globals } from "./app.js";

class Panel {

    constructor({ container, panel, isHidden, xFunction, yFunction }) {

        this.container = container;
        this.$panel = $(panel);
        this.isHidden = isHidden;
        this.xFunction = xFunction;
        this.yFunction = yFunction;

        this.layoutState = undefined;

        if (false === this.isHidden) {
            this.initializeLayout(xFunction, yFunction);
        }


        const namespace = `panel. ${ igv.guid() }`;

        const $drag_handle = this.$panel.find('.spacewalk_card_drag_container');
        makeDraggable(panel, $drag_handle.get(0));

        $drag_handle.on(`mousedown. ${ namespace }`, event => {
            // console.log('panel - did select panel');
            globals.eventBus.post({ type: "DidSelectPanel", data: this.$panel });
        });

        const $closer = this.$panel.find('i.fa-times-circle');
        $closer.on(`click.${ igv.guid() }`, event => {

            event.stopPropagation();

            const id = $closer.attr('data-target');
            const selector = `#${ id }`;
            const $input = $(selector);
            $input.prop('checked', false);

            this.moveOffScreen();
            this.isHidden = true;
        });

        this.$panel.on(`mouseenter. ${ namespace }`, (event) => {
            event.stopPropagation();
            globals.eventBus.post({ type: "DidEnterGUI" });
        });

        this.$panel.on(`mouseleave. ${ namespace }`, (event) => {
            event.stopPropagation();
            globals.eventBus.post({ type: "DidLeaveGUI" });
        });

        globals.eventBus.subscribe("ToggleUIControl", this);
        globals.eventBus.subscribe("AppWindowDidResize", this);
        globals.eventBus.subscribe("DidDragEnd", this);

    }

    receiveEvent({ type, data }) {

        if ("ToggleUIControl" === type && data && data.payload === this.$panel.attr('id')) {

            if (this.isHidden) {
                this.layout();
            } else {
                this.moveOffScreen();
            }

            this.isHidden = !this.isHidden;

        } else if ('AppWindowDidResize' === type) {

            if (false === this.isHidden) {
                this.layout();
            }

        } else if ('DidDragEnd' === type && data && data === this.$panel.attr('id')) {
            this.updateLayoutState();
        }
    }

    initializeLayout(xFunction, yFunction) {

        const { width: width_container, height: height_container } = $(this.container).get(0).getBoundingClientRect();
        const { width: width_panel,     height: height_panel     } =       this.$panel.get(0).getBoundingClientRect();

        const left = xFunction(width_container,   width_panel);
        const  top = yFunction(height_container, height_panel);

        this.$panel.offset( { left, top } );

        this.updateLayoutState();
    }

    layout(){

        if (this.layoutState) {
            const { topPercent, leftPercent } = this.layoutState;
            const top = topPercent * globals.appWindowHeight;
            const left = leftPercent * globals.appWindowWidth;
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
            this.layout();
            this.isHidden = false;
        }

        guiManager.panelIsVisible(this.$panel.attr('id'));

    };

    dismissPanel() {

        if (false === this.isHidden) {
            this.moveOffScreen();
            this.isHidden = true;
        }

        guiManager.panelIsHidden(this.$panel.attr('id'));

    };

    updateLayoutState() {
        const { top, left } = this.$panel.offset();
        const topPercent = top / globals.appWindowHeight;
        const leftPercent = left / globals.appWindowWidth;
        this.layoutState = { top, left, topPercent, leftPercent };
    }
}

export default Panel;
