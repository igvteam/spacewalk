import { EventBus } from 'igv-widgets'
import {clamp} from './math.js'
import {appleCrayonColorRGB255, rgb255String} from './color.js'

const namespace = '.spacewalk-render-container-drag'

let dragData = undefined

function configureRenderContainerDrag({ target, handle, container, topConstraint }) {

    const doDrag = event => {

        if(undefined === dragData) {
            return
        }

        const { left, top } = getConstrainedDragValue(target, container, topConstraint, event)
        target.style.left = left
        target.style.top  = top

    }

    const endDrag = event => {

        if(undefined === dragData) {
            return
        }

        const { left, top } = getConstrainedDragValue(target, container, topConstraint, event);
        target.style.left = left
        target.style.top  = top

        $(document).off(namespace)
        dragData = undefined

        EventBus.globalBus.post({ type: "DidEndRenderContainerDrag" })

    };

    handle.addEventListener('mouseenter', (event) => {
        event.stopPropagation()
        handle.style.backgroundColor = rgb255String(appleCrayonColorRGB255('snow'))
        handle.querySelector('i').style.color = rgb255String(appleCrayonColorRGB255('steel'))
    });

    handle.addEventListener('mouseleave', (event) => {
        event.stopPropagation()
        handle.style.backgroundColor = "transparent"
        handle.querySelector('i').style.color = "transparent"
    });

    $(handle).on(`mousedown.${ namespace }`, event => {

        event.stopPropagation()

        const { x, y } = target.getBoundingClientRect();

        dragData =
            {
                dx: x - event.screenX,
                dy: y - event.screenY
            };

        $(document).on(`mousemove.${  namespace }`, event => {
            event.stopPropagation()
            doDrag(event)
        })
        $(document).on(`mouseup.${    namespace }`, event => {
            event.stopPropagation()
            endDrag(event)
        })
        $(document).on(`mouseleave.${ namespace }`, event => {
            event.stopPropagation()
            endDrag(event)
        })
        $(document).on(`mouseexit.${  namespace }`, event => {
            event.stopPropagation()
            endDrag(event)
        })

    })

}

function getConstrainedDragValue(target, container, topConstraint, { screenX, screenY }) {

    const { x, y, width, height } = container.getBoundingClientRect();
    const { width:w, height:h } = target.getBoundingClientRect();

    let left = dragData.dx + screenX;
    left = clamp(left, x, width - w);

    let top = dragData.dy + screenY;

    const yy = topConstraint || y;
    top = clamp(top, yy, height - h);

    return { left: `${ left }px`, top: `${ top }px` }
}

export { configureRenderContainerDrag }
