import { globalEventBus } from "./eventBus.js";
import { readFileAsText } from './utils.js';

let currentURL = undefined;

class DataFileLoadModal {

    constructor({ $urlModal, $selectModal, $localFileInput, selectLoader, urlLoader, localFileLoader }) {

        // Select
        const $select_container = $selectModal.find('.modal-body div:first');

        const $select = $selectModal.find('select');
        selectLoader($select);

        $select.on('change.trace3d_data_file_load_select', async (event) => {
            event.stopPropagation();
            await loadURL({ url: event.target.value, urlLoader, $spinner: $select_container.find('.spinner-border'), $modal: $selectModal });

            const $option = $select.find('option:first');
            $select.val( $option.val() );

        });

        // URL
        const $url_upper_cancel_button = $urlModal.find('.modal-header button');

        const $url_container = $urlModal.find('.modal-body div:first');

        const $url_input = $urlModal.find('input');

        const $url_cancel_button = $urlModal.find('.modal-footer button:first');

        const $url_ok_button = $urlModal.find('.modal-footer button:last');

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
            await loadURL({ url: currentURL, urlLoader, $spinner: $url_container.find('.spinner-border'), $modal: $urlModal });

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
        $localFileInput.on('change.trace3d-file-load-local', (event) => {
            event.stopPropagation();
            loadFile(event.target.files[0], localFileLoader);
        });

    }

}

const loadURL = async ({ url, urlLoader, $spinner, $modal }) => {

    $spinner.show();

    url = url || '';

    if ('' !== url) {
        await urlLoader.loadURL({ url });
    }

    $spinner.hide();
    $modal.modal('hide');

    globalEventBus.post({ type: "DidLeaveGUI" });

};

const loadFile = async (file, localFileLoader) => {

    await localFileLoader.loadLocalFile({ file });

    globalEventBus.post({ type: "DidLeaveGUI" });
};

export default DataFileLoadModal;
