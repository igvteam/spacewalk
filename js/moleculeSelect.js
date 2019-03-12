import { makeDraggable } from "./draggable.js";
import {globalEventBus} from "./eventBus.js";
import { clamp } from './math.js'

let currentMoleculeKey = undefined;
class MoleculeSelect {

    constructor({ container, palette }) {

        this.$header = $('#trace3d_molecule_select_header');

        this.$input = $('#trace3d_molecule_select_input');

        this.$button_minus = $('#trace3d_molecule_select_button_minus');
        this.$button_plus = $('#trace3d_molecule_select_button_plus');

        this.keys = undefined;

        layout(container, palette);

        makeDraggable(palette, this.$header.get(0));

        $(window).on('resize.trace3d.molecule_select', () => { this.onWindowResize(container, palette) });

        $(palette).on('mouseenter.trace3d.molecule_select', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidEnterGUI" });
        });

        $(palette).on('mouseleave.trace3d.molecule_select', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidLeaveGUI" });
        });

        this.$button_minus.on('click.trace3d_molecule_select_button_minus', (e) => {

            let number = parseInt(currentMoleculeKey);
            number = clamp(number - 1, 0, (this.keys.length - 1));
            currentMoleculeKey = number.toString();

            this.$input.val(currentMoleculeKey);

            globalEventBus.post({ type: "DidSelectSegment", data: currentMoleculeKey });
        });

        this.$button_plus.on('click.trace3d_molecule_select_button_plus', (e) => {

            let number = parseInt(currentMoleculeKey);
            number = clamp(number + 1, 0, (this.keys.length - 1));
            currentMoleculeKey = number.toString();

            this.$input.val(currentMoleculeKey);

            globalEventBus.post({ type: "DidSelectSegment", data: currentMoleculeKey });
        });

        this.$input.on('keyup.trace3d_molecule_select_input', (e) => {

            // enter (return) key pressed
            if (13 === e.keyCode) {

                let number = parseInt( this.$input.val() );
                number = clamp(number, 0, (this.keys.length - 1));

                currentMoleculeKey = number.toString();
                this.$input.val(currentMoleculeKey);

                globalEventBus.post({ type: "DidSelectSegment", data: currentMoleculeKey });
            }

        });

        const $footer = $('#trace3d_molecule_select_footer');

    }

    configure({ segments, initialMoleculeKey }) {

        this.keys = Object.keys(segments);
        this.$header.text(this.keys.length + ' molecules');

        currentMoleculeKey = initialMoleculeKey;
        this.$input.val(currentMoleculeKey);

    }

    onWindowResize(container, palette) {
        layout(container, palette);
    };

}

let layout = (container, element) => {

    // const { left, top, right, bottom, x, y, width, height } = container.getBoundingClientRect();
    const rectContainer = container.getBoundingClientRect();
    const rectElement = element.getBoundingClientRect();

    const left = 0.125 * rectElement.width;
    const top = (rectContainer.height - rectElement.height)/2;
    $(element).offset( { left, top } );

};

export default MoleculeSelect;
