import { eventBus } from "./app.js";

const namespace = '.spacewalk_drag';
let dragData;

let makeDraggable = (targetElement, handleElement) => {
    $(handleElement).on('mousedown' + namespace, dragStart.bind(targetElement));
};

function dragStart(event) {

    event.stopPropagation();
    // event.preventDefault();

    const dragFunction = drag.bind(this);
    const dragEndFunction = dragEnd.bind(this);

    const { x, y } = this.getBoundingClientRect();

    dragData =
        {
            dragFunction: dragFunction,
            dragEndFunction: dragEndFunction,
            dx: x - event.screenX,
            dy: y - event.screenY
        };

    $(document).on('mousemove' + namespace, dragFunction);
    $(document).on('mouseup' + namespace, dragEndFunction);
    $(document).on('mouseleave' + namespace, dragEndFunction);
    $(document).on('mouseexit' + namespace, dragEndFunction);

}

function drag(event) {

    if(!dragData) {
        console.log("No drag data!");
        return;
    }

    event.stopPropagation();

    this.style.left = `${ dragData.dx + event.screenX }px`;
    this.style.top  = `${ dragData.dy + event.screenY }px`;

}
function dragEnd(event) {

    if(!dragData) {
        console.log("No drag data!");
        return;
    }

    event.stopPropagation();

    this.style.left = `${ dragData.dx + event.screenX }px`;
    this.style.top  = `${ dragData.dy + event.screenY }px`;

    $(document).off(namespace);
    dragData = undefined;

    const id = $(this).attr('id');
    eventBus.post({ type: "DidDragEnd", data: id });

}

export { makeDraggable };
