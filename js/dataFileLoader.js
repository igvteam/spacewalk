import igv from '../vendor/igv.esm.js'
import {makeDraggable} from "./draggable.js";
import { globalEventBus } from "./main.js";

let currentFile = undefined;
let currentURL = undefined;
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
            console.log('url on change - value ' + event.target.value);
            currentURL = event.target.value;
        });

        $('#trace3d_data_file_load_url_button').on('click.trace3d_data_file_load_url_button', (event) => {
            event.stopPropagation();
            $url_input.trigger('change.trace3d_data_file_load_url_input');
            loadURL(currentURL);
        });

        // Local file
        const $local_file_input = $('#trace3d_data_file_load_local_file_input');
        const $local_file_button = $('#trace3d_data_file_load_local_button');

        $local_file_input.on('change.trace3d_data_file_load_local_file_input', (event) => {
            event.stopPropagation();
            currentFile = event.target.files[0];
            $('#trace3d_data_file_load_local_file_label').text(currentFile.name);
        });

        $local_file_button.on('click.trace3d_data_file_load_local_button', handleUpload);

    }

    onWindowResize(container, palette) {
        layout(container, palette);
    };

}

const loadURL = async (path) => {

    try {
        const urlContents = await igv.xhr.load(path);
        globalEventBus.post({ type: "DidLoadCSVFile", data: urlContents });
    } catch (error) {
        console.warn(error.message)
    }

};

const handleUpload = async (event) => {

    event.stopPropagation();

    try {
        const fileContents = await readFileAsText(currentFile);
        globalEventBus.post({ type: "DidLoadCSVFile", data: fileContents });
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
    const top = 0.25 * elementRect.height;
    $(element).offset( { left, top } );

};

export default DataFileLoader;
