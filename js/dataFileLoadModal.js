import { juiceboxPanel } from "./gui.js";
import { juiceboxSelectLoader } from "./juicebox/juiceboxPanel.js";
import { globals } from "./app.js";

let currentURL = undefined;

class DataFileLoadModal {

    constructor({ $urlModal, $selectModal, $localFileInput, selectLoader, fileLoader }) {

        const selectOnChange = ($selectModal, $select) => {

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

        if (selectLoader) {
            selectLoader($selectModal, selectOnChange);
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

const loadURL = ({ url, name, fileLoader, $modal }) => {

    $modal.modal('hide');
    globals.eventBus.post({ type: "DidLeaveGUI" });

    fileLoader.loadURL({ url, name });

};

const loadFile = (file, fileLoader) => {

    globals.eventBus.post({ type: "DidLeaveGUI" });
    fileLoader.loadLocalFile({ file });

};

const spaceWalkFileLoadModalConfigurator = () => {

    return {
        $urlModal: $('#spacewalk-sw-load-url-modal'),
        $selectModal: $('#spacewalk-sw-load-select-modal'),
        $localFileInput: $('#spacewalk-sw-load-local-input'),
        selectLoader: undefined,
        fileLoader: globals.parser
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

const gsdbFileLoadModalConfigurator = () => {

    return {
        $urlModal: $('#spacewalk-sw-load-url-modal'),
        $selectModal: $('#spacewalk-gsdb-modal'),
        $localFileInput: $('#spacewalk-sw-load-local-input'),
        selectLoader: gsdbSelectLoader,
        fileLoader: globals.parser
    }
};

const gsdbSelectLoader = async ($selectModal, onChange) => {

    const jsonFile = 'resources/gsdb.json';

    let myJSON = undefined;
    try {

        const response = await fetch(jsonFile);

        if (!response.ok) {
            throw new Error(`Unable to retrieve ${ jsonFile }.`);
        }

        myJSON = await response.json();

    } catch (error) {
        console.error(error);
    }

    if (myJSON) {

        const $select = $selectModal.find('select');

        let urls = [];
        traverseJSON(myJSON, urls, '');

        let counter = 0;
        for (let { name, url } of urls) {

            url = `http://${ url }`;
            const str = `<option value="${ url }">${ name }</option>`;
            const $option = $(str);
            $select.append($option);

            if (3e3 === counter++) {
                break
            }
        }

        onChange($selectModal, $select);
    }

};

const traverseJSON = (o, urls, label) => {

    if ('directory' === o.type) {

        for (let thang of o.children) {

            const str = '' === label ? o.name : `${ label }-${ o.name }`;
            traverseJSON(thang, urls, str);
        }

    } else {
        const { name, url } = o;
        const str = `${ label }-${ name }`;
        urls.push({ name: str, url });
    }

};

export { gsdbFileLoadModalConfigurator, spaceWalkFileLoadModalConfigurator, juiceboxFileLoadModalConfigurator };

export default DataFileLoadModal;
