import SpacewalkEventBus from './spacewalkEventBus.js'

const namespace = '.spacewalk-drag';
let dragData;

function makeDraggable(targetElement, handleElement, constraint){
    $(handleElement).on('mousedown' + namespace, dragStart.bind(targetElement))

    function dragStart(event) {

        event.stopPropagation();

        const { x, y } = this.getBoundingClientRect()

        dragData =
            {
                dx: x - event.screenX,
                dy: y - event.screenY
            };

        $(document).on('mousemove' + namespace, drag.bind(this));
        $(document).on('mouseup' + namespace, dragEnd.bind(this));
        $(document).on('mouseleave' + namespace, dragEnd.bind(this));
        $(document).on('mouseexit' + namespace, dragEnd.bind(this));

    }

}

function drag(event) {

    event.stopPropagation();

    if(!dragData) {
        console.log("No drag data!");
        return;
    }

    // console.log(`left(${ dragData.dx + event.screenX }) top(${ dragData.dy + event.screenY })`)

    // constrain drag extent

    const { height:topConstraint } = document.querySelector('.navbar').getBoundingClientRect()

    let  top = Math.max(topConstraint, dragData.dy + event.screenY )
    let left = Math.max(      0, dragData.dx + event.screenX )

    const { width, height } = this.getBoundingClientRect()

    if (top + height > window.innerHeight) {
        top = window.innerHeight - height
    }

    if (left + width > window.innerWidth) {
        left = window.innerWidth - width
    }

    this.style.left = `${ left }px`;
    this.style.top  = `${ top }px`;

}

function dragEnd(event) {

    event.stopPropagation();

    if(!dragData) {
        console.log("No drag data!");
        return;
    }

    // this.style.left = `${ dragData.dx + event.screenX }px`
    // this.style.top  = `${ dragData.dy + event.screenY }px`

    $(document).off(namespace);
    dragData = undefined;

    const id = $(this).attr('id');
    SpacewalkEventBus.globalBus.post({ type: "DidEndDrag", data: id });

}

export { makeDraggable }
