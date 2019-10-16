import { juiceboxSelectLoader } from "./juicebox/juiceboxPanel.js";
import { parser, juiceboxPanel, eventBus } from "./app.js";

let currentURL = undefined;

class DataFileLoadModal {

    constructor({ $urlModal, $selectModal, $localFileInput, selectLoader, fileLoader }) {

        if (selectLoader) {

            selectLoader($selectModal, () => {
                configureSelectOnChange($selectModal.find('select'), $selectModal, fileLoader);
            });

        } else {
            configureSelectOnChange($selectModal.find('select'), $selectModal, fileLoader);
        }

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

        $url_ok_button.on('click.spacewalk_data_file_load_url_button', event => {
            event.stopPropagation();
            $url_input.trigger('change.spacewalk_data_file_load_url_input');
            loadURL({ url: currentURL, name: 'unnamed', fileLoader, $modal: $urlModal });

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
        $localFileInput.on('change.spacewalk-ensemble-load-local', event => {

            event.stopPropagation();

            if (event.target.files.length > 0) {
                loadFile(event.target.files[0], fileLoader);
            }

        });

    }

}

const configureSelectOnChange = ($select, $selectModal, fileLoader) => {

    $select.on('change', event => {
        event.stopPropagation();

        let url = $select.val();
        url = url || '';

        const index = $select.get(0).selectedIndex;
        const option = $select.get(0)[ index ];
        const name = $(option).text();

        if ('' !== url) {
            loadURL({ url, name, fileLoader, $modal: $selectModal });
        }

        const $option = $select.find('option:first');
        $select.val( $option.val() );

    });


};

const loadURL = ({ url, name, fileLoader, $modal }) => {

    $modal.modal('hide');
    eventBus.post({ type: "DidLeaveGUI" });

    fileLoader.loadURL({ url, name });

};

const loadFile = (file, fileLoader) => {

    eventBus.post({ type: "DidLeaveGUI" });
    fileLoader.loadLocalFile({ file });

};

const spaceWalkFileLoadModalConfigurator = () => {

    return {
        $urlModal: $('#spacewalk-sw-load-url-modal'),
        $selectModal: $('#spacewalk-sw-load-select-modal'),
        $localFileInput: $('#spacewalk-sw-load-local-input'),
        selectLoader: undefined,
        fileLoader: parser
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

export { spaceWalkFileLoadModalConfigurator, juiceboxFileLoadModalConfigurator };

export default DataFileLoadModal;
