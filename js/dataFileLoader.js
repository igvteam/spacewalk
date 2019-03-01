import {makeDraggable} from "./draggable.js";
import { globalEventBus } from "./main.js";

class DataFileLoader {

    constructor({ container, palette }) {

        layout(container, palette);

        // makeDraggable(palette, $('#trace3d_last_div').get(0));
        makeDraggable(palette, palette);

        $(window).on('resize.trace3d.data_file_load_widget', () => { this.onWindowResize(container, palette) });

        $(palette).on('mouseenter.trace3d.data_file_load_widget', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidEnterGUI" });
        });

        $(palette).on('mouseleave.trace3d.data_file_load_widget', (event) => {
            event.stopPropagation();
            globalEventBus.post({ type: "DidLeaveGUI" });
        });

        // URL
        const $url_input = $('#trace3d_data_file_load_url_input');

        $url_input.on('change.trace3d_data_file_load_url_input', (event) => {
            event.stopPropagation();
            // console.log('on change - value ' + $url_input.val());
        });

        $('#trace3d_data_file_load_url_button').on('click.trace3d_data_file_load_url_button', () => {
            event.stopPropagation();
            console.log('button click - value ' + $url_input.val());
            $url_input.val('');
        });

        // Local file
        const $local_file_input = $('#trace3d_data_file_load_local_file_input');

        $local_file_input.on('change.trace3d_data_file_load_local_file_input', (event) => {
            event.stopPropagation();
            const input = $local_file_input.get(0);
            const filename = input.files[ 0 ].name;
            $('#trace3d_data_file_load_local_file_label').text(filename);
        });

    }

    onWindowResize(container, palette) {
        layout(container, palette);
    };

}

let layout = (container, element) => {

    // const { left, top, right, bottom, x, y, width, height } = container.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    const left = (containerRect.width - elementRect.width)/2;
    const top = 0.25 * elementRect.height;
    $(element).offset( { left, top } );

};

export default DataFileLoader;
