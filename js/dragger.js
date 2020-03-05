import { eventBus } from "./app.js";
import {clamp} from "./math.js";

const namespace = '.spacewalk_drag';

class Dragger {

    constructor(target, handle, container, topConstraint) {

        this.target = target;
        this.handle = handle;
        this.dragData = undefined;

        $(handle).on(`mousedown.${ namespace }`, event => {

            event.stopPropagation();

            const doDrag = event => {

                if(undefined === this.dragData) {
                    console.log("No drag data!");
                    return;
                }

                event.stopPropagation();

                const { left, top } = this.getConstrainedDragValue(target, container, topConstraint, event);
                target.style.left = left;
                target.style.top  = top;

            };

            const endDrag = event => {

                if(undefined === this.dragData) {
                    console.log("No drag data!");
                    return;
                }

                event.stopPropagation();

                const { left, top } = this.getConstrainedDragValue(target, container, topConstraint, event);
                target.style.left = left;
                target.style.top  = top;

                $(document).off(namespace);
                this.dragData = undefined;

                const id = target.id;
                eventBus.post({ type: "DraggerDidEnd", data: id });

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

    getConstrainedDragValue(target, container, topConstraint, { screenX, screenY }) {

        const { x, y, width, height } = container.getBoundingClientRect();
        const { width:w, height:h } = target.getBoundingClientRect();

        let left = this.dragData.dx + screenX;
        left = clamp(left, x, width - w);

        let top = this.dragData.dy + screenY;

        const yy = topConstraint || y;
        top = clamp(top, yy, height - h);

        return { left: `${ left }px`, top: `${ top }px` }
    }
}

export default Dragger
