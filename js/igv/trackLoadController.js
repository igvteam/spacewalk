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
import EncodeDataSource from '../../node_modules/data-modal/js/encodeDataSource.js'
import ModalTable from '../../node_modules/data-modal/js/modalTable.js'
import MultipleFileLoadController from "./multipleFileLoadController.js";
import { igvPanel } from '../gui.js';
import hic from '../../node_modules/juicebox.js/dist/juicebox.esm.js';

class TrackLoadController {

    constructor({ browser, trackRegistryFile, $urlModal, encodeModalTable, $dropdownMenu, $genericTrackSelectModal, uberFileLoader}) {

        this.browser = browser;
        this.trackRegistryFile = trackRegistryFile;
        this.trackRegistry = undefined;
        this.encodeModalTable = encodeModalTable;
        this.$dropdownMenu = $dropdownMenu;
        this.$modal = $genericTrackSelectModal;

        // URL
        const urlConfig =
            {
                $widgetParent: $urlModal.find('.modal-body'),
                mode: 'url',
            };

        this.urlWidget = new FileLoadWidget(urlConfig, new FileLoadManager());
        configureModal(this.urlWidget, $urlModal, (fileLoadManager) => {
            uberFileLoader.ingestPaths(fileLoadManager.getPaths());
            return true;
        });

    }

    createEncodeTable(genomeID) {
        const datasource = new EncodeDataSource(genomeID);
        this.encodeModalTable.setDatasource(datasource)
    };

    async updateTrackMenus(genomeID) {

        const id_prefix = 'genome_specific_';

        const $divider = this.$dropdownMenu.find('#spacewalk-igv-app-annotations-section');

        const searchString = '[id^=' + id_prefix + ']';
        const $found = this.$dropdownMenu.find(searchString);
        $found.remove();

        if (this.trackRegistry) {
            // do nothing;
        } else if (this.trackRegistryFile) {

            try {
                this.trackRegistry = await hic.igv.xhr.loadJson(this.trackRegistryFile);
            } catch(error) {
                console.error(error);
            }

        } else {
            throw new Error('Can not find track registry file');
        }


        if (undefined === this.trackRegistry) {
            throw new Error('Can not create track registry');
        }

        const paths = this.trackRegistry[ genomeID ];

        if (undefined === paths) {
            console.warn(`No additional track menu items genome ID ${ genomeID }`);
            // throw new Error(`Unsupported genome ID ${ genomeID }`);
            return;
        }

        let results = [];
        for (let path of paths.filter( (path) => ( !path.startsWith("@EXTRA") ) ) ) {

            try {
                const result = await hic.igv.xhr.loadJson((path));
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

            if ($('#spacewalk-encode-modal-button').length) {
                // do nothing
            } else {
                const $button = $('<button>', { 'id':'spacewalk-encode-modal-button', 'class':'dropdown-item', 'type':'button', 'data-toggle':'modal', 'data-target':'#spacewalk-encode-modal' });
                $button.insertAfter($divider);

                const { label } = encodeConfiguration[ 0 ];
                $button.text( (label + ' ...') );
            }

        }

        let gtexConfiguration = results.filter((c) => { return 'GTEX' === c.type });
        if (gtexConfiguration && gtexConfiguration.length > 0) {

            gtexConfiguration = gtexConfiguration.pop();
            try {
                const info = await hic.igv.GtexUtils.getTissueInfo(gtexConfiguration.genomeID);
                gtexConfiguration.tracks = info.tissueInfo.map((tissue) => { return hic.igv.GtexUtils.trackConfiguration(tissue) });
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

                this.$modal.find('#spacewalk-igv-app-generic-track-select-modal-label').html(markup);

                configureModalSelectList(this.$modal, config.tracks);
                this.$modal.modal('show');

            });

        }

    };


}

export const trackLoadControllerConfigurator = (browser) => {

    const multipleFileTrackConfig =
        {
            $modal: $('#spacewalk-igv-app-multiple-file-load-modal'),
            modalTitle: 'Track File Error',
            $localFileInput: $('#spacewalk-igv-app-dropdown-local-track-file-input'),
            $dropboxButton: $('#spacewalk-igv-app-dropdown-dropbox-track-file-button'),
            $googleDriveButton: undefined,
            configurationHandler: MultipleFileLoadController.trackConfigurator,
            jsonFileValidator: MultipleFileLoadController.trackJSONValidator,
            pathValidator: MultipleFileLoadController.trackPathValidator,
            fileLoadHandler: trackConfigurations => {
                igvPanel.loadTrackList(trackConfigurations);
            }
        };

    const encodeModalTableConfig =
        {
            id: "spacewalk-encode-modal",
            title: "ENCODE",
            selectHandler: trackConfigurations => {
                igvPanel.loadTrackList(trackConfigurations);
            }
        };

    return {
        browser,
        trackRegistryFile: "resources/tracks/trackRegistry.json",
        $urlModal: $('#spacewalk-igv-app-track-from-url-modal'),
        encodeModalTable: new ModalTable(encodeModalTableConfig),
        $dropdownMenu: $('#spacewalk-igv-app-track-dropdown-menu'),
        $genericTrackSelectModal: $('#spacewalk-igv-app-generic-track-select-modal'),
        uberFileLoader: new MultipleFileLoadController(browser, multipleFileTrackConfig)
    }

};

function configureModalSelectList($modal, configurations) {

    let $select = $modal.find('select');
    $select.empty();

    $select.append($('<option>', { text: 'Choose...' }));

    for (let config of configurations) {

        let $option = $('<option>', { value: config.name, text: config.name });
        $select.append($option);

        $option.data('track', config);
    }

    $select.on('change', function (e) {

        const $option = $(this).find('option:selected');
        const value = $option.val();

        if ('' === value) {
            // do nothing
        } else {
            const trackConfiguration = $option.data('track');
            $option.removeAttr("selected");
            igvPanel.loadTrack(trackConfiguration);
        }

        $modal.modal('hide');

    });

}

export default TrackLoadController;
