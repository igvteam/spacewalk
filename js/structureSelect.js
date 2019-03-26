import { makeDraggable } from "./draggable.js";
import {globalEventBus} from "./eventBus.js";
import { clamp } from './math.js'

let currentStructureKey = undefined;
class StructureSelect {

    constructor({ container, palette }) {

        this.$header = $('#trace3d_structure_select_header');

        this.$input = $('#trace3d_structure_select_input');

        this.$button_minus = $('#trace3d_structure_select_button_minus');
        this.$button_plus = $('#trace3d_structure_select_button_plus');

        this.keys = undefined;

        layout(container, palette);

        makeDraggable(palette, $(palette).find('.trace3d_card_drag_container').get(0));

        $(window).on('resize.trace3d.structure_select', () => { this.onWindowResize(container, palette) });

        $(palette).on('mouseenter.trace3d.structure_select', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidEnterGUI" });
        });

        $(palette).on('mouseleave.trace3d.structure_select', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidLeaveGUI" });
        });

        this.$button_minus.on('click.trace3d_structure_select_button_minus', (e) => {

            let number = parseInt(currentStructureKey);
            number = clamp(number - 1, 0, (this.keys.length - 1));
            currentStructureKey = number.toString();

            this.$input.val(currentStructureKey);

            globalEventBus.post({ type: "DidSelectStructure", data: currentStructureKey });
        });

        this.$button_plus.on('click.trace3d_structure_select_button_plus', (e) => {

            let number = parseInt(currentStructureKey);
            number = clamp(number + 1, 0, (this.keys.length - 1));
            currentStructureKey = number.toString();

            this.$input.val(currentStructureKey);

            globalEventBus.post({ type: "DidSelectStructure", data: currentStructureKey });
        });

        this.$input.on('keyup.trace3d_structure_select_input', (e) => {

            // enter (return) key pressed
            if (13 === e.keyCode) {

                let number = parseInt( this.$input.val() );
                number = clamp(number, 0, (this.keys.length - 1));

                currentStructureKey = number.toString();
                this.$input.val(currentStructureKey);

                globalEventBus.post({ type: "DidSelectStructure", data: currentStructureKey });
            }

        });

        // $(document).on('keydown.structure_select', keyHandler);
        $(document).on('keyup.structure_select', keyHandler);
        // $(document).on('keypress.structure_select', keyHandler);
    }

    configure({ structures, initialStructureKey }) {

        this.keys = Object.keys(structures);
        this.$header.text(this.keys.length + ' structures');

        currentStructureKey = initialStructureKey;
        this.$input.val(currentStructureKey);

    }

    onWindowResize(container, palette) {
        layout(container, palette);
    };

}

const decrement = () => {
    console.log(Date.now() + ' -');
};

const increment = () => {
    console.log(Date.now() + ' +');
};

const controls =
    {
        'ArrowLeft': decrement,
        'ArrowRight': increment,
    };

let keyHandler = (e) => {

    e.preventDefault();

    if (controls[ e.key ]) {
        controls[ e.key ]();
    }

    return;

    // let str =
    //     e.type + ' key=' + e.key + ' code=' + e.code +
    //     (e.shiftKey ? ' shiftKey' : '') +
    //     (e.ctrlKey  ? ' ctrlKey'  : '') +
    //     (e.altKey   ? ' altKey'   : '') +
    //     (e.metaKey  ? ' metaKey'  : '') +
    //     (e.repeat   ? ' (repeat)' : '');

    // let str = ' key ' + e.key;
    // console.log(Date.now() + str);

};


let layout = (container, element) => {

    // const { left, top, right, bottom, x, y, width, height } = container.getBoundingClientRect();
    const rectContainer = container.getBoundingClientRect();
    const rectElement = element.getBoundingClientRect();

    const left = 0.125 * rectElement.width;
    const top = (rectContainer.height - rectElement.height)/2;
    $(element).offset( { left, top } );

};

export default StructureSelect;
