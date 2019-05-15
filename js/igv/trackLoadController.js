/*
 *  The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 The Regents of the University of California
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the
 * following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
 * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,  FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

import {configureModal} from './utils-igv-webapp.js';
import FileLoadWidget from './fileLoadWidget.js';
import FileLoadManager from './fileLoadManager.js';
import EncodeDataSource from '../../node_modules/dataModal/js/encodeDataSource.js'
import ModalTable from '../../node_modules/dataModal/js/modalTable.js'

import MultipleFileLoadController from "./multipleFileLoadController.js";

class TrackLoadController {

    constructor({ browser, trackRegistryFile, $urlModal, encodeModalTable, $dropdownMenu, $genericTrackSelectModal, uberFileLoader}) {


        let urlConfig;

        this.trackRegistryFile = trackRegistryFile;
        this.browser = browser;
        this.$modal = $genericTrackSelectModal;
        this.$dropdownMenu = $dropdownMenu;

        this.encodeModalTable = encodeModalTable;

        // URL
        urlConfig =
            {
                $widgetParent: $urlModal.find('.modal-body'),
                mode: 'url',
            };

        this.urlWidget = new FileLoadWidget(urlConfig, new FileLoadManager());
        configureModal(this.urlWidget, $urlModal, (fileLoadManager) => {
            uberFileLoader.ingestPaths(fileLoadManager.getPaths());
            return true;
        });

        this.updateTrackMenus(browser.genome.id);

    }

    async getTrackRegistry() {

        const self = this;

        if (this.trackRegistry) {
            return this.trackRegistry;
        } else if (this.trackRegistryFile) {

            let registry = undefined;

            try {
                registry = await igv.xhr.loadJson(this.trackRegistryFile);
            } catch(err) {
                console.error(error);
            }

            return registry;

        } else {
            return undefined;
        }

    }

    createEncodeTable(genomeID) {
        const datasource = new EncodeDataSource(genomeID);
        this.encodeModalTable.setDatasource(datasource)
    };

    async updateTrackMenus(genomeID) {

        const id_prefix = 'genome_specific_';

        const $divider = this.$dropdownMenu.find('#igv-app-annotations-section');

        const searchString = '[id^=' + id_prefix + ']';
        const $found = this.$dropdownMenu.find(searchString);
        $found.remove();

        this.trackRegistry = await this.getTrackRegistry();

        if (undefined === this.trackRegistry) {
            console.log("Info -- No track registry file  (config.trackRegistryFile)");
            return;
        }

        const paths = this.trackRegistry[ genomeID ];

        if (undefined === paths) {
            console.log("No tracks defined for: " + genomeID);
            return;
        }

        let results = [];
        for (let path of paths.filter( (path) => ( !path.startsWith("@EXTRA") ) ) ) {

            try {
                const result = await igv.xhr.loadJson((path));
                results.push(result);
            } catch(err) {
                console.error(err);
            }

        }

        const set = new Set([ 'ENCODE', 'GTEX' ]);
        let configurations = results.filter((c) => { return !set.has(c.type) });

        let encodeConfiguration = results.filter((c) => { return 'ENCODE' === c.type });
        if (encodeConfiguration && encodeConfiguration.length > 0) {

            this.createEncodeTable(encodeConfiguration[ 0 ].genomeID);

            const $button = $('<button>', { 'class':'dropdown-item', 'type':'button', 'data-toggle':'modal', 'data-target':'#igv-app-encode-modal' });
            $button.insertAfter($divider);

            const { label } = encodeConfiguration[ 0 ];
            $button.text( (label + ' ...') );
        }

        let gtexConfiguration = results.filter((c) => { return 'GTEX' === c.type });
        if (gtexConfiguration && gtexConfiguration.length > 0) {

            gtexConfiguration = gtexConfiguration.pop();
            try {

                // TESTING
                // await igv.xhr.loadJson('http://www.nothingtoseehere.com', {});

                const info = await igv.GtexUtils.getTissueInfo(gtexConfiguration.genomeID);
                gtexConfiguration.tracks = info.tissueInfo.map((tissue) => { return igv.GtexUtils.trackConfiguration(tissue) });
                configurations.push(gtexConfiguration);
            } catch(err) {
                console.error(err);
            }

        }

        for (let config of configurations) {

            const $button = $('<button>', {class: 'dropdown-item', type: 'button'});
            const str = config.label + ' ...';
            $button.text(str);

            const id = id_prefix + config.label.toLowerCase().split(' ').join('_');
            $button.attr('id', id);

            $button.insertAfter($divider);

            $button.on('click', () => {
                let markup;

                markup = '<div>' + config.label + '</div>';
                if (config.description) {
                    markup += '<div>' + config.description + '</div>';
                }

                this.$modal.find('#igv-app-generic-track-select-modal-label').html(markup);

                configureModalSelectList(this.$modal, config.tracks, config.label);
                this.$modal.modal('show');

            });

        }

    };


}

export const trackLoadControllerConfigurator = ({ browser, trackRegistryFile, $googleDriveButton }) => {

    const multipleFileTrackConfig =
        {
            $modal: $('#igv-app-multiple-file-load-modal'),
            modalTitle: 'Track File Error',
            $localFileInput: $('#igv-app-dropdown-local-track-file-input'),
            $dropboxButton: $('#igv-app-dropdown-dropbox-track-file-button'),
            $googleDriveButton,
            configurationHandler: MultipleFileLoadController.trackConfigurator,
            jsonFileValidator: MultipleFileLoadController.trackJSONValidator,
            pathValidator: MultipleFileLoadController.trackPathValidator,
            fileLoadHandler: (configurations) => {
                browser.loadTrackList( configurations );
            }
        };

    const encodeModalTableConfig =
        {
            id: "igv-app-encode-modal",
            title: "ENCODE",
            selectHandler: trackConfigurations => {
                browser.loadTrackList(trackConfigurations);
            }
        };

    return {
        browser,
        trackRegistryFile,
        $urlModal: $('#igv-app-track-from-url-modal'),
        encodeModalTable: new ModalTable(encodeModalTableConfig),
        $dropdownMenu: $('#igv-app-track-dropdown-menu'),
        $genericTrackSelectModal: $('#igv-app-generic-track-select-modal'),
        uberFileLoader: new MultipleFileLoadController(browser, multipleFileTrackConfig)
    }

};

function configureModalSelectList($modal, configurations, promiseTaskName) {

    let $select,
        $option;

    $modal.find('select').remove();

    $select = $('<select>', {class: 'form-control'});
    $modal.find('.form-group').append($select);

    $option = $('<option>', {text: 'Select...'});
    $select.append($option);

    $option.attr('selected', 'selected');
    $option.val(undefined);

    configurations
        .reduce(function ($accumulator, trackConfiguration) {

            $option = $('<option>', {value: trackConfiguration.name, text: trackConfiguration.name});
            $select.append($option);

            $option.data('track', trackConfiguration);

            $accumulator.append($option);

            return $accumulator;
        }, $select);

    $select.on('change', function (e) {
        let $option,
            trackConfiguration,
            value;

        $option = $(this).find('option:selected');
        value = $option.val();

        if ('' === value) {
            // do nothing
        } else {
            trackConfiguration = $option.data('track');
            $option.removeAttr("selected");

            igv.browser.loadTrack(trackConfiguration);

        }

        $modal.modal('hide');

    });

}

export default TrackLoadController;
