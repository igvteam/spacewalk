import { eventBus } from "./app.js";

const namespace = '.spacewalk_drag';
let dragData;

class Dragger {

    constructor(target, handle, container) {

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

                target.style.left = `${ this.dragData.dx + event.screenX }px`;
                target.style.top  = `${ this.dragData.dy + event.screenY }px`;

            };

            const endDrag = event => {

                if(undefined === this.dragData) {
                    console.log("No drag data!");
                    return;
                }

                event.stopPropagation();

                target.style.left = `${ this.dragData.dx + event.screenX }px`;
                target.style.top  = `${ this.dragData.dy + event.screenY }px`;

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


}

export default Dragger
