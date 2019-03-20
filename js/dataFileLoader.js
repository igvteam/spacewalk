import igv from '../vendor/igv.esm.js'
import { globalEventBus } from "./eventBus.js";

let currentURL = undefined;
class DataFileLoader {

    constructor({ $urlModal, $selectModal }) {

        // Select
        const $select = $('#trace3d_data_file_load_select');

        const $select_button = $('#trace3d_data_file_load_select_button');
        $select_button.prop('disabled', true);

        $select.on('change.trace3d_data_file_load_select', (event) => {
            event.stopPropagation();
            currentURL = event.target.value;
            $select_button.prop('disabled', false);
        });

        const $select_container = $('#trace3d_data_file_load_select_container');

        $select_button.on('click.trace3d_data_file_load_select_button', (event) => {
            event.stopPropagation();
            loadURL({ url: currentURL, $spinner: $select_container.find('.spinner-border'), $modal: $selectModal });
            $select_button.prop('disabled', true);
            currentURL = undefined;

            const $option = $select.find('option:first');
            $select.val( $option.val() );
        });

        // URL
        const $url_input = $('#trace3d_data_file_load_url_input');
        $url_input.val('');

        const $url_button = $('#trace3d_data_file_load_url_button');
        $url_button.prop('disabled', true);

        $url_input.on('change.trace3d_data_file_load_url_input', (event) => {
            event.stopPropagation();
            currentURL = event.target.value;
        });

        const $url_container = $('#trace3d_data_file_load_url_container');

        $url_button.on('click.trace3d_data_file_load_url_button', (event) => {
            event.stopPropagation();
            $url_input.trigger('change.trace3d_data_file_load_url_input');
            loadURL({ url: currentURL, $spinner: $url_container.find('.spinner-border'), $modal: $urlModal });
            $url_input.val('');
            currentURL = undefined;
        });

        $('#trace3d-file-load-local').on('change.trace3d-file-load-local', (event) => {
            event.stopPropagation();
            loadFile(event.target.files[0]);
        });

    }

}

const loadURL = async ({ url, $spinner, $modal }) => {

    url = url || '';

    if ('' !== url) {

        try {

            const { file } = igv.parseUri(url);

            $spinner.show();
            const urlContents = await igv.xhr.load(url);
            $spinner.hide();

            $modal.modal('hide');

            globalEventBus.post({ type: "DidLoadCSVFile", data: { name: file, payload: urlContents } });

        } catch (error) {
            console.warn(error.message)
        }

    }

    globalEventBus.post({ type: "DidLeaveGUI" });

};

const loadFile = async file => {

    try {
        const fileContents = await readFileAsText(file);
        globalEventBus.post({ type: "DidLoadCSVFile", data: { name: file.name, payload: fileContents } });
    } catch (e) {
        console.warn(e.message)
    }

    globalEventBus.post({ type: "DidLeaveGUI" });
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

export default DataFileLoader;
