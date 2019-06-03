import { globalEventBus } from "./eventBus.js";
import { juiceboxPanel } from "./gui.js";
import { juiceboxSelectLoader } from "./juicebox/juiceboxPanel.js";
import Globals from './globals.js';

let currentURL = undefined;

class DataFileLoadModal {

    constructor({ $urlModal, $selectModal, $localFileInput, selectLoader, fileLoader }) {

        // Select
        const $select_container = $selectModal.find('.modal-body div:first');

        const $select = $selectModal.find('select');

        if (selectLoader) {
            selectLoader($select);
        }

        $select.on('change.spacewalk_data_file_load_select', async (event) => {
            event.stopPropagation();

            //
            const url = $select.val();
            const index = $select.get(0).selectedIndex;
            const option = $select.get(0)[ index ];

            //
            const name = $(option).text();

            await loadURL({ url, name, fileLoader, $spinner: $select_container.find('.spinner-border'), $modal: $selectModal });

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

        $url_input.on('change.spacewalk_data_file_load_url_input', (event) => {
            event.stopPropagation();
            currentURL = event.target.value;
            $url_ok_button.prop('disabled', false);
        });

        $url_ok_button.on('click.spacewalk_data_file_load_url_button', async (event) => {
            event.stopPropagation();
            $url_input.trigger('change.spacewalk_data_file_load_url_input');
            await loadURL({ url: currentURL, name: 'unnamed', fileLoader, $spinner: $url_container.find('.spinner-border'), $modal: $urlModal });

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
        $localFileInput.on('change.spacewalk-file-load-local', (event) => {
            event.stopPropagation();
            loadFile(event.target.files[0], fileLoader);
        });

    }

}

const loadURL = async ({ url, name, fileLoader, $spinner, $modal }) => {

    $spinner.show();

    url = url || '';

    if ('' !== url) {
        await fileLoader.loadURL({ url, name });
    }

    $spinner.hide();
    $modal.modal('hide');

    globalEventBus.post({ type: "DidLeaveGUI" });

};

const loadFile = async (file, fileLoader) => {

    await fileLoader.loadLocalFile({ file });

    globalEventBus.post({ type: "DidLeaveGUI" });
};

const structureFileLoadModalConfigurator = () => {

    return {
        $urlModal: $('#spacewalk-file-load-url-modal'),
        $selectModal: $('#spacewalk-file-load-select-modal'),
        $localFileInput: $('#spacewalk-file-load-local-input'),
        selectLoader: undefined,
        fileLoader: Globals.ensembleManager
    }
};

const juiceboxFileLoadModalConfigurator = () => {

    return {
        $urlModal: $('#hic-load-url-modal'),
        $selectModal: $('#hic-contact-map-select-modal'),
        $localFileInput: $('#spacewalk-juicebox-load-local-input'),
        selectLoader: juiceboxSelectLoader,
        fileLoader: juiceboxPanel
    }
};


export { structureFileLoadModalConfigurator, juiceboxFileLoadModalConfigurator };

export default DataFileLoadModal;
