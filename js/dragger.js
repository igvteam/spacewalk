import { eventBus } from "./app.js";
import {clamp} from "./math.js";

const namespace = '.spacewalk_drag';
let dragData;

class Dragger {

    constructor(target, handle, { xmin, xmax, ymin, ymax }) {

        this.target = target;
        this.handle = handle;
        this.container = container;
        this.dragData = undefined;

        $(handle).on(`mousedown.${ namespace }`, event => {

            event.stopPropagation();

            const doDrag = event => {

                if(undefined === this.dragData) {
                    console.log("No drag data!");
                    return;
                }

                event.stopPropagation();

                const { left, top } = this.getConstrainedDragValue(target, container, event);
                target.style.left = left;
                target.style.top  = top;

            };

            const endDrag = event => {

                if(undefined === this.dragData) {
                    console.log("No drag data!");
                    return;
                }

                event.stopPropagation();

                const { left, top } = this.getConstrainedDragValue(target, container, event);
                target.style.left = left;
                target.style.top  = top;

                $(document).off(namespace);
                this.dragData = undefined;

                const id = target.id;
                eventBus.post({ type: "DidDragEnd", data: id });

            };

            const { x, y } = target.getBoundingClientRect();

            this.dragData =
                {
                    dx: x - event.screenX,
                    dy: y - event.screenY
                };

            $(document).on(`mousemove.${  namespace }`, doDrag);
            $(document).on(`mouseup.${    namespace }`, endDrag);
            $(document).on(`mouseleave.${ namespace }`, endDrag);
            $(document).on(`mouseexit.${  namespace }`, endDrag);

        });
    }

    getConstrainedDragValue(target, container, { screenX, screenY }) {

        const { width:wc, height:hc } = container.getBoundingClientRect();
        const { width:w, height:h } = target.getBoundingClientRect();

        let left = this.dragData.dx + screenX;
        left = clamp(left, 0, wc - w);

        let top = this.dragData.dy + screenY;
        top = clamp(top, 0, hc - h);

        return { left: `${ left }px`, top: `${ top }px` }
    }
}

export default Dragger
