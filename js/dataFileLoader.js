import igv from '../vendor/igv.esm.js'
import { globalEventBus } from "./eventBus.js";

let currentURL = undefined;

class DataFileLoader {

    constructor({ $urlModal, $selectModal }) {

        // Select
        const $select_container = $selectModal.find('#trace3d_data_file_load_select_container');
        const $select = $selectModal.find('#trace3d_data_file_load_select');

        $select.on('change.trace3d_data_file_load_select', async (event) => {
            event.stopPropagation();
            await loadURL({ url: event.target.value, $spinner: $select_container.find('.spinner-border'), $modal: $selectModal });

            const $option = $select.find('option:first');
            $select.val( $option.val() );

        });

        // URL
        const $url_container = $('#trace3d_data_file_load_url_container');
        const $url_input = $('#trace3d_data_file_load_url_input');
        const $url_upper_cancel_button = $('#trace3d_data_file_load_url_upper_cancel_button');
        const $url_cancel_button = $('#trace3d_data_file_load_url_cancel_button');
        const $url_ok_button = $('#trace3d_data_file_load_url_ok_button');

        $url_input.val('');
        $url_ok_button.prop('disabled', true);

        $url_input.on('change.trace3d_data_file_load_url_input', (event) => {
            event.stopPropagation();
            currentURL = event.target.value;
            $url_ok_button.prop('disabled', false);
        });

        $url_ok_button.on('click.trace3d_data_file_load_url_button', async (event) => {
            event.stopPropagation();
            $url_input.trigger('change.trace3d_data_file_load_url_input');
            await loadURL({ url: currentURL, $spinner: $url_container.find('.spinner-border'), $modal: $urlModal });

            $url_input.val('');
            currentURL = undefined;
            $url_ok_button.prop('disabled', true);
        });

        let doCancel = (event) => {
            event.stopPropagation();
            $url_input.val('');
            currentURL = undefined;
            $url_ok_button.prop('disabled', true);
            $urlModal.modal('hide');
        };

        $url_upper_cancel_button.on('click', doCancel);

        $url_cancel_button.on('click', doCancel);

        // local file
        $('#trace3d-file-load-local').on('change.trace3d-file-load-local', (event) => {
            event.stopPropagation();
            loadFile(event.target.files[0]);
        });

    }

}

const loadURL = async ({ url, $spinner, $modal }) => {

    $spinner.show();

    url = url || '';

    if ('' !== url) {

        try {

            let urlContents = await igv.xhr.load(url);
            const { file } = igv.parseUri(url);

            globalEventBus.post({ type: "DidLoadFile", data: { name: file, payload: urlContents } });

        } catch (error) {
            console.warn(error.message);
        }

    }

    $spinner.hide();
    $modal.modal('hide');

    globalEventBus.post({ type: "DidLeaveGUI" });

};

const loadFile = async file => {

    try {
        const fileContents = await readFileAsText(file);
        globalEventBus.post({ type: "DidLoadFile", data: { name: file.name, payload: fileContents } });
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
