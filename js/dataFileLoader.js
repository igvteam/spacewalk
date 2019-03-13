import igv from '../vendor/igv.esm.js'
import {makeDraggable} from "./draggable.js";
import { globalEventBus } from "./eventBus.js";

let currentFile = undefined;
let currentURL = undefined;
class DataFileLoader {

    constructor({ container, palette, presentationButton }) {

        layout(container, palette);

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
        $url_input.val('');

        const $url_button = $('#trace3d_data_file_load_url_button');

        $url_input.on('change.trace3d_data_file_load_url_input', (event) => {
            event.stopPropagation();
            // console.log('url on change - value ' + event.target.value);
            currentURL = event.target.value;
        });

        const $url_container = $('#trace3d_data_file_load_url_container');

        $url_button.on('click.trace3d_data_file_load_url_button', (event) => {
            event.stopPropagation();
            $url_input.trigger('change.trace3d_data_file_load_url_input');
            loadURL({ url: currentURL, $spinner: $url_container.find('.spinner-border')});
            $url_input.val('');
            currentURL = undefined;

            $(palette).hide();
        });

        // Local file
        const $file_input = $('#trace3d_data_file_load_local_file_input');
        $file_input.val('');

        const $file_label = $('#trace3d_data_file_load_local_file_label');
        $file_label.text('Choose CSV File');

        const $file_button = $('#trace3d_data_file_load_local_file_button');
        $file_button.prop('disabled', true);

        $file_input.on('change.trace3d_data_file_load_local_file_input', (event) => {
            event.stopPropagation();
            // console.log('file on change - value ' + event.target.value);
            $file_label.text(event.target.files[0].name);
            currentFile = event.target.files[0];
            $file_button.prop('disabled', false);
        });

        $file_button.on('click.trace3d_data_file_load_local_file_button', (event) => {
            event.stopPropagation();
            loadFile(currentFile);
            $file_label.text('Choose CSV File');
            currentFile = undefined;
            $file_button.prop('disabled', true);

            $(palette).hide();
        });

        $(presentationButton).on('click.trace3d_present_data_file_load_palette', (e) => {
            $(palette).toggle();
        });

        $(palette).hide();

    }

    onWindowResize(container, palette) {
        layout(container, palette);
    };

}

const loadURL = async ({ url, $spinner }) => {

    url = url || '';

    if ('' !== url) {

        try {

            const { file } = igv.parseUri(url);

            $spinner.show();
            const urlContents = await igv.xhr.load(url);
            $spinner.hide();

            globalEventBus.post({ type: "DidLoadCSVFile", data: { name: file, payload: urlContents } });

        } catch (error) {
            console.warn(error.message)
        }

    }


};

const loadFile = async file => {

    try {
        const fileContents = await readFileAsText(file);
        globalEventBus.post({ type: "DidLoadCSVFile", data: { name: file.name, payload: fileContents } });
    } catch (e) {
        console.warn(e.message)
    }
};

const readFileAsText = file => {

    const fileReader = new FileReader();

    return new Promise((resolve, reject) => {
        fileReader.onerror = () => {
            fileReader.abort();
            reject(new DOMException("Problem parsing input file."));
        };

        fileReader.onload = () => {
            resolve(fileReader.result);
        };

        fileReader.readAsText(file);
    });
};

let layout = (container, element) => {

    // const { left, top, right, bottom, x, y, width, height } = container.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    const left = (containerRect.width - elementRect.width)/2;
    const top = 1.25 * elementRect.height;
    $(element).offset( { left, top } );

};

export default DataFileLoader;
