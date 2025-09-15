import SpacewalkEventBus from './spacewalkEventBus.js'
import {clamp} from './utils/mathUtils.js'

let dragData = undefined

// Generalized drag configuration function
function configureDrag(targetElementId, dragHandleId, container, options = {}) {
    // Default options
    const {
        topConstraint: providedTopConstraint,
        namespace: customNamespace,
        onDragStart,
        onDragEnd
    } = options

    // Calculate top constraint - can be from navbar element, number, or undefined
    let topConstraint = providedTopConstraint
    if (typeof providedTopConstraint === 'object' && providedTopConstraint !== null) {
        const { height } = providedTopConstraint.getBoundingClientRect()
        topConstraint = height
    }

    // Use custom namespace or generate one based on target element
    const namespace = customNamespace || `.spacewalk-drag-${targetElementId.replace(/[^a-zA-Z0-9]/g, '-')}`

    const target = document.getElementById(targetElementId)
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

        // Call custom onDragEnd callback if provided
        if (onDragEnd) {
            onDragEnd(event, { left, top })
        }

        SpacewalkEventBus.globalBus.post({ type: "DidEndRenderContainerDrag" })

    };

    const handle = document.getElementById(dragHandleId)
    $(handle).on(`mousedown.${ namespace }`, event => {

        event.stopPropagation()

        const { x, y } = target.getBoundingClientRect();

        dragData =
            {
                dx: x - event.screenX,
                dy: y - event.screenY
            };

        // Call custom onDragStart callback if provided
        if (onDragStart) {
            onDragStart(event, { x, y })
        }

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

// Backward-compatible wrapper for existing usage
function configureRenderContainerDrag(navbar, container) {
    return configureDrag(
        'spacewalk-threejs-container',
        'spacewalk-threejs-drag-container',
        container,
        { topConstraint: navbar }
    )
}

export { configureDrag, configureRenderContainerDrag }
